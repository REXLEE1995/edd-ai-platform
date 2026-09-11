"""
======================================================================
PDF 文字脱敏与品牌替换工具 (服务端容器化 / 独立字体 / 零临时文件)
======================================================================

【主要特性】
1. 服务端容器化与独立字体库：
   - 完全脱离宿主机/操作系统内置字体依赖（严禁读取 Windows/macOS 系统字体）；
   - 纯项目内嵌字体：优先读取项目/服务端内置的阿里巴巴普惠体 2.0 字体库；
   - 支持通过环境变量 FONTS_DIR / PDF_FONTS_DIR、配置项或 CLI 参数灵活指定字体目录。

2. 智能样本探测与灵活参数化：
   - 自动扫描并识别当前目录下的测试样本 PDF（无需硬编码路径即可开箱即用）；
   - 支持通过函数参数自定义输入/输出路径与规则；
   - 支持丰富 CLI 命令行参数（-i/--input, -o/--output, -b/--batch, --fonts-dir）；
   - 支持批量处理整个文件夹内的 PDF 文件。

3. 多策略规则引擎 (Rule-based Engine)：
   - 'full_line': 整行抹除并重绘（如模型评分说明行）；
   - 'paragraph': 多行段落抹除并重绘（如信用等级说明双行段落）；
   - 'title_sampled_bg': 自动采样背景色、动态提取原等级字符（如 A/B+/C 等）并重绘大标题；
   - 'badge_sampled_bg': 自动采样背景色、图表徽标区域居中对齐重绘（如评分卡圆环小标）；
   - 'inplace': 原位精准逐字/逐词替换（100% 继承原处字号、颜色、字重与 Origin 基线）。

4. 真实字体与字重精准匹配 (100% 还原原版排版)：
   - 内置阿里巴巴普惠体 2.0 (AlibabaPuHuiTi) 全套字重 (Black/Bold/Medium/Regular/Light)；
   - 字体对象与路径全程全局缓存，性能极佳；
   - 自动字体子集化 (subsetting) 与垃圾回收压缩，生成文件体积紧凑；
   - 全程纯内存处理，不输出任何中间预览图片与冗余垃圾文件。
======================================================================
"""

import sys
import os
import glob
import time
import argparse
from typing import List, Dict, Any, Union, Optional, Tuple
import pymupdf


if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


DEFAULT_CONFIG = {
    'input_pdf': None,
    'output_pdf': None,
    'fonts_dir': None,
    'custom_font_black': None,
    'custom_font_bold': None,
    'custom_font_medium': None,
    'custom_font_regular': None,
    'custom_font_light': None,
    'font_scale': 1.0,
}

DEFAULT_RULES: List[Dict[str, Any]] = [
    {
        'name': '正文模型说明行',
        'enabled': True,
        'search_text': '本模型评分（微巡检分）',
        'rule_type': 'full_line',
        'replacement': '本模型评分（享宇智评分）分值范围设定为 325~900 分。',
        'fontsize': 10.5,
        'weight': 'bold',
        'color': (0.4, 0.4, 0.4),
        'x0': 30.0,
        'insert_x': 34.0,
        'y_offset': 3.2,
    },
    {
        'name': '信用等级说明段落',
        'enabled': True,
        'search_text': '信用等级（微巡检等级）',
        'rule_type': 'paragraph',
        'replacement_lines': [
            '信用等级（享宇智评等级）采用五类八级，依据分值由高到低具体划分为：A、B+、B、C+、C、D+、D 和 E 级。信',
            '用等级越高，表示企业的信用程度较高，履约能力越强。',
        ],
        'fontsize': 10.5,
        'weight': 'regular',
        'color': (0.4, 0.4, 0.4),
        'x0': 30.0,
        'insert_x': 34.0,
        'y_offset': 3.2,
        'line_spacing': 19.1,
        'redact_height': 46.0,
    },
    {
        'name': '评分卡等级大标题',
        'enabled': True,
        'search_text': '微巡检等级：',
        'rule_type': 'title_sampled_bg',
        'replacement': '享宇智评等级：',
        'fontsize': 22.0,
        'weight': 'bold',
        'color': (1.0, 1.0, 1.0),
        'extra_width': 65.0,
        'y_offset': 6.5,
    },
    {
        'name': '评分卡圆环指标小标',
        'enabled': True,
        'search_text': '微巡检分',
        'rule_type': 'badge_sampled_bg',
        'replacement': '享宇智评分',
        'fontsize': 9.0,
        'weight': 'regular',
        'color': (1.0, 1.0, 1.0),
        'y_offset': 2.8,
        'bg_threshold': 200,
    },
    {
        'name': '全局微巡检原位替换',
        'enabled': True,
        'search_text': '微巡检',
        'rule_type': 'inplace',
        'replacement': '享宇智评',
    },
    {
        'name': '全局微风企原位替换',
        'enabled': True,
        'search_text': '微风企',
        'rule_type': 'inplace',
        'replacement': '享宇智评',
    },
    {
        'name': '全局微风企原位替换2',
        'enabled': True,
        'search_text': '示例',
        'rule_type': 'inplace',
        'replacement': '测试',
    },
]

_FONT_PATH_CACHE: Dict[str, str] = {}
_FONT_OBJ_CACHE: Dict[str, pymupdf.Font] = {}


def resolve_fonts_dir(custom_dir: Optional[str] = None) -> str:
    """
    确定项目字体目录的绝对路径（完全脱离宿主机操作系统字体）。
    
    优先级：
    1. 函数显式传入路径 (custom_dir)
    2. 环境变量 (FONTS_DIR 或 PDF_FONTS_DIR，方便 Docker/K8s 容器化配置)
    3. 当前脚本同级目录下的 'fonts/' 文件夹
    4. 项目根目录下的 'pdftest/fonts/' 或 'fonts/' 文件夹
    """
    if custom_dir and os.path.exists(custom_dir):
        return os.path.abspath(custom_dir)
    
    env_dir = os.environ.get('FONTS_DIR') or os.environ.get('PDF_FONTS_DIR')
    if env_dir and os.path.exists(env_dir):
        return os.path.abspath(env_dir)
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    local_fonts = os.path.join(script_dir, 'fonts')
    if os.path.exists(local_fonts) and os.path.isdir(local_fonts):
        return local_fonts
    
    parent_dir = os.path.dirname(script_dir)
    for cand in (
        os.path.join(parent_dir, 'fonts'),
        os.path.join(parent_dir, 'pdftest', 'fonts'),
        os.path.join(parent_dir, 'backend', 'fonts'),
    ):
        if os.path.exists(cand) and os.path.isdir(cand):
            return os.path.abspath(cand)
    
    return local_fonts


def get_preferred_font_path(
    weight: str = 'regular',
    custom_font: Optional[str] = None,
    fonts_dir: Optional[str] = None,
) -> str:
    """
    获取项目内固定字体文件路径（完全脱离对操作系统内置字体的依赖，确保在 Linux/Docker 服务端稳定运行）。
    
    支持字重：
    - black  (115): AlibabaPuHuiTi-2-115-Black.ttf
    - bold   (85) : AlibabaPuHuiTi-2-85-Bold.ttf
    - medium (65) : AlibabaPuHuiTi-2-65-Medium.ttf
    - regular(55) : AlibabaPuHuiTi-2-55-Regular.ttf
    - light  (45) : AlibabaPuHuiTi-2-45-Light.ttf
    """
    if custom_font and os.path.exists(custom_font):
        return os.path.abspath(custom_font)
    
    resolved_dir = resolve_fonts_dir(fonts_dir)
    weight_key = str(weight).lower().strip()
    cache_key = f"{resolved_dir}:{weight_key}"
    
    if cache_key in _FONT_PATH_CACHE:
        return _FONT_PATH_CACHE[cache_key]
    
    font_candidates_map = {
        'black': [
            'AlibabaPuHuiTi-2-115-Black.ttf', 'AlibabaPuHuiTi-2-115-Black.otf',
            'AlibabaPuHuiTi-2-105-Heavy.ttf', 'AlibabaPuHuiTi-2-105-Heavy.otf',
            'AlibabaPuHuiTi-2-95-ExtraBold.ttf', 'AlibabaPuHuiTi-2-95-ExtraBold.otf',
            'AlibabaPuHuiTi-2-85-Bold.ttf',
        ],
        'bold': [
            'AlibabaPuHuiTi-2-85-Bold.ttf', 'AlibabaPuHuiTi-2-85-Bold.otf',
            'AlibabaPuHuiTi-2-75-SemiBold.ttf', 'AlibabaPuHuiTi-2-75-SemiBold.otf',
        ],
        'medium': [
            'AlibabaPuHuiTi-2-65-Medium.ttf', 'AlibabaPuHuiTi-2-65-Medium.otf',
            'AlibabaPuHuiTi-2-55-Regular.ttf',
        ],
        'light': [
            'AlibabaPuHuiTi-2-45-Light.ttf', 'AlibabaPuHuiTi-2-45-Light.otf',
            'AlibabaPuHuiTi-2-35-Thin.ttf', 'AlibabaPuHuiTi-2-35-Thin.otf',
            'AlibabaPuHuiTi-2-55-Regular.ttf',
        ],
        'regular': [
            'AlibabaPuHuiTi-2-55-Regular.ttf',
            'AlibabaPuHuiTi-2-55-Regular.otf',
        ],
    }
    
    if weight_key in ('black', 'heavy', '115', '105', '95', 'extrabold'):
        category = 'black'
    elif weight_key in ('bold', '85', '75', 'semibold', 'demibold', 'w7', 'w8', 'w9'):
        category = 'bold'
    elif weight_key in ('medium', '65', 'w5', 'w6'):
        category = 'medium'
    elif weight_key in ('light', 'thin', '45', '35', 'w1', 'w2', 'w3', 'extralight'):
        category = 'light'
    else:
        category = 'regular'
    
    candidates = font_candidates_map.get(category, font_candidates_map['regular'])
    chosen = None
    
    if os.path.exists(resolved_dir):
        for fn in candidates:
            p = os.path.join(resolved_dir, fn)
            if os.path.exists(p) and os.path.getsize(p) > 10000:
                chosen = p
                break
    
    if not chosen and os.path.exists(resolved_dir):
        reg_path = os.path.join(resolved_dir, 'AlibabaPuHuiTi-2-55-Regular.ttf')
        if os.path.exists(reg_path) and os.path.getsize(reg_path) > 10000:
            chosen = reg_path
    
    if not chosen and os.path.exists(resolved_dir):
        any_fonts = glob.glob(os.path.join(resolved_dir, '*.[to]tf'))
        if any_fonts:
            chosen = any_fonts[0]
    
    if not chosen:
        raise FileNotFoundError(
            f"❌ 服务端字体文件缺失！\n"
            f"在项目字体目录 [{resolved_dir}] 中未找到有效的阿里巴巴普惠体 (AlibabaPuHuiTi) 文件。\n"
            f"请确认项目包含 'fonts/' 目录及对应字体文件，或通过环境变量 FONTS_DIR 指定服务端字体存放路径。"
        )
    
    _FONT_PATH_CACHE[cache_key] = chosen
    return chosen


def get_cached_font_obj(font_path: str) -> pymupdf.Font:
    """获取全局缓存的 PyMuPDF Font 实例，加速文字测量"""
    if font_path not in _FONT_OBJ_CACHE:
        _FONT_OBJ_CACHE[font_path] = pymupdf.Font(fontfile=font_path)
    return _FONT_OBJ_CACHE[font_path]


def detect_font_style(span: Dict[str, Any]) -> Dict[str, Any]:
    """
    精准识别原 PDF 文本 Span 的字体字重（Black / Bold / Medium / Regular / Light）
    """
    font_name = span.get('font', '').lower()
    flags = span.get('flags', 0)
    
    if any(kw in font_name for kw in ('115_bla', 'black', '105_heavy', 'heavy', '95_extra')):
        return {'weight': 'black', 'is_bold': True, 'is_light': False}
    
    if any(kw in font_name for kw in ('85_bold', 'bold', '75_semi', 'semibold', 'demibold', 'w7', 'w8', 'w9', 'bd')):
        return {'weight': 'bold', 'is_bold': True, 'is_light': False}
    
    if any(kw in font_name for kw in ('65_med', 'medium')):
        return {'weight': 'medium', 'is_bold': False, 'is_light': False}
    
    if any(kw in font_name for kw in ('35_thin', '45_light', 'light', 'thin', 'extralight')):
        return {'weight': 'light', 'is_bold': False, 'is_light': True}
    
    if any(kw in font_name for kw in ('55_regu', 'regu', 'regular', 'normal', 'book', 'sans-regular')):
        return {'weight': 'regular', 'is_bold': False, 'is_light': False}
    
    if bool(flags & 16 or flags & 262144):
        return {'weight': 'bold', 'is_bold': True, 'is_light': False}
    
    return {'weight': 'regular', 'is_bold': False, 'is_light': False}


def _select_font_for_rule(rule: Dict[str, Any], font_paths: Dict[str, str]) -> Tuple[str, str]:
    """根据规则配置选择合适的字体路径与字体别名"""
    weight = rule.get('weight')
    if not weight:
        weight = 'bold' if rule.get('bold') else 'regular'
    weight_str = str(weight).lower()
    fpath = font_paths.get(weight_str, font_paths['regular'])
    fname = f"rule-font-{weight_str}"
    return fpath, fname


def _handle_full_line(page: pymupdf.Page, rule: Dict[str, Any], font_paths: Dict[str, str], page_num: int) -> int:
    """处理策略：整行擦除并重绘"""
    search_text = rule['search_text']
    rects = page.search_for(search_text)
    if not rects:
        return 0
    
    count = 0
    pad_y = rule.get('pad_y', 4.0)
    x0 = rule.get('x0', 30.0)
    x1_margin = rule.get('x1_margin', 30.0)
    insert_x = rule.get('insert_x', 34.0)
    y_offset = rule.get('y_offset', 3.2)
    fontsize = rule.get('fontsize', 10.5)
    color = rule.get('color', (0.4, 0.4, 0.4))
    replacement = rule.get('replacement', '')
    font_path, fontname = _select_font_for_rule(rule, font_paths)
    
    for r in rects:
        page.add_redact_annot(
            pymupdf.Rect(x0, r.y0 - pad_y, page.rect.width - x1_margin, r.y1 + pad_y),
            fill=(1.0, 1.0, 1.0)
        )
        page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=0)
        page.insert_text(
            pymupdf.Point(insert_x, r.y1 - y_offset),
            replacement,
            fontfile=font_path,
            fontname=fontname,
            fontsize=fontsize,
            color=color,
        )
        count += 1
        print(f"  [第 {page_num} 页] 命中整行规则 [{rule.get('name', 'full_line')}]: {search_text} -> {replacement}")
    return count


def _handle_paragraph(page: pymupdf.Page, rule: Dict[str, Any], font_paths: Dict[str, str], page_num: int) -> int:
    """处理策略：多行段落擦除并重绘"""
    search_text = rule['search_text']
    rects = page.search_for(search_text)
    if not rects:
        return 0
    
    count = 0
    pad_top = rule.get('pad_top', 4.0)
    redact_height = rule.get('redact_height', 46.0)
    x0 = rule.get('x0', 30.0)
    x1_margin = rule.get('x1_margin', 30.0)
    insert_x = rule.get('insert_x', 34.0)
    y_offset = rule.get('y_offset', 3.2)
    line_spacing = rule.get('line_spacing', 19.1)
    fontsize = rule.get('fontsize', 10.5)
    color = rule.get('color', (0.4, 0.4, 0.4))
    font_path, fontname = _select_font_for_rule(rule, font_paths)
    
    lines = rule.get('replacement_lines')
    if lines is None:
        rep = rule.get('replacement', '')
        lines = rep.split('\n') if isinstance(rep, str) else [str(rep)]
    
    for r in rects:
        page.add_redact_annot(
            pymupdf.Rect(x0, r.y0 - pad_top, page.rect.width - x1_margin, r.y0 + redact_height),
            fill=(1.0, 1.0, 1.0)
        )
        page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=0)
        for line_idx, line_text in enumerate(lines):
            line_y = (r.y1 - y_offset) + (line_idx * line_spacing)
            page.insert_text(
                pymupdf.Point(insert_x, line_y),
                line_text,
                fontfile=font_path,
                fontname=fontname,
                fontsize=fontsize,
                color=color,
            )
        count += 1
        print(f"  [第 {page_num} 页] 命中段落规则 [{rule.get('name', 'paragraph')}]: 重绘 {len(lines)} 行文本")
    return count


def _handle_title_sampled_bg(page: pymupdf.Page, rule: Dict[str, Any], font_paths: Dict[str, str], page_num: int) -> int:
    """
    处理策略：采样卡片背景色重绘大标题
    - 支持自动提取并保留原等级后缀（如 '微巡检等级：B+' -> '享宇智评等级：B+'）
    """
    search_text = rule['search_text']
    rects = page.search_for(search_text)
    if not rects:
        return 0
    
    count = 0
    extra_width = rule.get('extra_width', 65.0)
    y_offset = rule.get('y_offset', 6.5)
    fontsize = rule.get('fontsize', 22.0)
    color = rule.get('color', (1.0, 1.0, 1.0))
    raw_replacement = rule.get('replacement', '')
    font_path, fontname = _select_font_for_rule(rule, font_paths)
    
    pix = page.get_pixmap(dpi=150)
    scale_x = pix.width / page.rect.width
    scale_y = pix.height / page.rect.height
    
    rdict = page.get_text('rawdict')
    extracted_suffix = ''
    for b in rdict.get('blocks', []):
        for l in b.get('lines', []):
            for s in l.get('spans', []):
                span_text = ''.join(c.get('c', '') for c in s.get('chars', []))
                if search_text in span_text:
                    after_part = span_text.split(search_text, 1)[1].strip()
                    if after_part:
                        extracted_suffix = after_part
                        break
    
    if raw_replacement.endswith('：') or raw_replacement.endswith(':'):
        if extracted_suffix:
            final_replacement = f"{raw_replacement}{extracted_suffix}"
        else:
            final_replacement = f"{raw_replacement}B+"
    else:
        final_replacement = raw_replacement
    
    for r in rects:
        sx = max(0, min(pix.width - 1, int(r.x0 * scale_x)))
        sy = max(0, min(pix.height - 1, int((r.y0 - 5) * scale_y)))
        bg_rgb = pix.pixel(sx, sy)[:3]
        bg_norm = (bg_rgb[0] / 255.0, bg_rgb[1] / 255.0, bg_rgb[2] / 255.0)
        
        page.add_redact_annot(
            pymupdf.Rect(r.x0 - 5.0, r.y0 - 5.0, r.x1 + extra_width, r.y1 + 5.0),
            fill=bg_norm
        )
        page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=0)
        page.insert_text(
            pymupdf.Point(r.x0, r.y1 - y_offset),
            final_replacement,
            fontfile=font_path,
            fontname=fontname,
            fontsize=fontsize,
            color=color,
        )
        count += 1
        print(f"  [第 {page_num} 页] 命中大标题规则 [{rule.get('name', 'title_sampled_bg')}]: {search_text} -> {final_replacement} (采样底色 RGB={bg_rgb})")
    return count


def _handle_badge_sampled_bg(page: pymupdf.Page, rule: Dict[str, Any], font_paths: Dict[str, str], page_num: int) -> int:
    """处理策略：采样背景色并在指标区域居中重绘"""
    search_text = rule['search_text']
    rects = page.search_for(search_text)
    if not rects:
        return 0
    
    count = 0
    y_offset = rule.get('y_offset', 2.8)
    fontsize = rule.get('fontsize', 9.0)
    color = rule.get('color', (1.0, 1.0, 1.0))
    bg_thresh = rule.get('bg_threshold', 200)
    replacement = rule.get('replacement', '')
    font_path, fontname = _select_font_for_rule(rule, font_paths)
    
    pix = page.get_pixmap(dpi=150)
    scale_x = pix.width / page.rect.width
    scale_y = pix.height / page.rect.height
    font_obj = get_cached_font_obj(font_path)
    
    for r in rects:
        sx = max(0, min(pix.width - 1, int(r.x0 * scale_x)))
        sy = max(0, min(pix.height - 1, int((r.y0 - 5) * scale_y)))
        bg_rgb = pix.pixel(sx, sy)[:3]
        
        if bg_rgb[0] < bg_thresh or bg_rgb[1] < bg_thresh or bg_rgb[2] < bg_thresh:
            bg_norm = (bg_rgb[0] / 255.0, bg_rgb[1] / 255.0, bg_rgb[2] / 255.0)
            page.add_redact_annot(
                pymupdf.Rect(r.x0 - 8.0, r.y0 - 3.0, r.x1 + 15.0, r.y1 + 3.0),
                fill=bg_norm
            )
            page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=0)
            
            orig_center_x = (r.x0 + r.x1) / 2.0
            text_w = font_obj.text_length(replacement, fontsize=fontsize)
            insert_x = orig_center_x - (text_w / 2.0)
            
            page.insert_text(
                pymupdf.Point(insert_x, r.y1 - y_offset),
                replacement,
                fontfile=font_path,
                fontname=fontname,
                fontsize=fontsize,
                color=color,
            )
            count += 1
            print(f"  [第 {page_num} 页] 命中徽标规则 [{rule.get('name', 'badge_sampled_bg')}]: {search_text} -> {replacement} (采样底色 RGB={bg_rgb})")
    return count


def _handle_inplace(page: pymupdf.Page, rule: Dict[str, Any], font_paths: Dict[str, str], page_num: int) -> int:
    """
    处理策略：全局词汇原位精准替换
    - 逐字/逐词原位对齐 (1:1 坐标继承)
    - 1:1 继承原处精确字号 (严禁失真缩放)
    - 精准字重匹配 (Black / Bold / Medium / Regular / Light)
    - 无损擦除原文本，保留矢量图形与图片底色
    """
    search_text = rule['search_text']
    replacement = rule.get('replacement', '')
    page_text = page.get_text() or ''
    if search_text not in page_text:
        return 0
    
    rdict = page.get_text('rawdict')
    draw_ops = []
    
    for b in rdict.get('blocks', []):
        for l in b.get('lines', []):
            for s in l.get('spans', []):
                chars = s.get('chars', [])
                text = ''.join(c.get('c', '') for c in chars)
                if search_text not in text:
                    continue
                
                idx = 0
                while True:
                    pos = text.find(search_text, idx)
                    if pos == -1:
                        break
                    
                    matched_chars = chars[pos:pos + len(search_text)]
                    if matched_chars:
                        bbox = pymupdf.Rect(matched_chars[0]['bbox'])
                        for mc in matched_chars[1:]:
                            bbox |= pymupdf.Rect(mc['bbox'])
                        
                        font_scale = rule.get('font_scale', font_paths.get('font_scale', 1.0))
                        fontsize = rule.get('fontsize', s.get('size', 10.0) * font_scale)
                        
                        if 'color' in rule:
                            color = rule['color']
                        else:
                            color_int = s.get('color', 0)
                            color = (
                                ((color_int >> 16) & 255) / 255.0,
                                ((color_int >> 8) & 255) / 255.0,
                                (color_int & 255) / 255.0
                            )
                        
                        if 'weight' in rule:
                            target_weight = rule['weight']
                        elif 'bold' in rule:
                            target_weight = 'bold' if rule['bold'] else 'regular'
                        else:
                            span_style = detect_font_style(s)
                            target_weight = span_style['weight']
                        
                        draw_ops.append({
                            'matched_chars': matched_chars,
                            'bbox': bbox,
                            'fontsize': fontsize,
                            'color': color,
                            'weight': target_weight,
                            'search_text': search_text,
                            'new_text': replacement,
                        })
                        page.add_redact_annot(bbox, fill=False)
                    
                    idx = pos + len(search_text)
    
    if not draw_ops:
        return 0
    
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
    for op in draw_ops:
        weight = op['weight']
        fpath = font_paths.get(weight, font_paths['regular'])
        fname = f"inplace-{weight}"
        mchars = op['matched_chars']
        new_text = op['new_text']
        old_text = op['search_text']
        
        if len(new_text) == len(old_text) and len(mchars) == len(new_text):
            for i, ch in enumerate(new_text):
                pt = pymupdf.Point(mchars[i]['origin'])
                page.insert_text(
                    pt,
                    ch,
                    fontfile=fpath,
                    fontname=fname,
                    fontsize=op['fontsize'],
                    color=op['color'],
                )
        else:
            pt = pymupdf.Point(mchars[0]['origin'])
            page.insert_text(
                pt,
                new_text,
                fontfile=fpath,
                fontname=fname,
                fontsize=op['fontsize'],
                color=op['color'],
            )
    
    count = len(draw_ops)
    print(f"  [第 {page_num} 页] 命中原位规则 [{rule.get('name', 'inplace')}]: {search_text} -> {replacement} (共 {count} 处)")
    return count


def auto_detect_input_pdf() -> str:
    """
    智能自动探测输入 PDF 文件：
    优先级：测试样例#真实报告.pdf > 测试样例#测试报告.pdf > 目录下其他报告 PDF > 任意 PDF
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    priority_samples = [
        '测试样例#真实报告.pdf',
        '测试样例#测试报告.pdf',
        '贷前报告样例.pdf',
        '贷前报告04182501.pdf',
    ]
    for sample in priority_samples:
        p = os.path.join(script_dir, sample)
        if os.path.exists(p):
            return p
    
    all_pdfs = glob.glob(os.path.join(script_dir, '*.pdf'))
    valid_pdfs = [f for f in all_pdfs if not any(kw in os.path.basename(f) for kw in ('-修改', '-脱敏', 'output'))]
    if valid_pdfs:
        return sorted(valid_pdfs)[0]
    if all_pdfs:
        return all_pdfs[0]
    
    raise FileNotFoundError('❌ 错误：当前目录未找到任何可处理的 PDF 文件！')


def normalize_rules(rules: Optional[Union[List[Dict[str, Any]], Dict[str, str]]]) -> List[Dict[str, Any]]:
    """将不同格式的规则（字典或列表）标准化为统一的规则对象列表"""
    if rules is None:
        return [r for r in DEFAULT_RULES if r.get('enabled', True)]
    
    if isinstance(rules, dict):
        norm_list = []
        for old_t, new_t in rules.items():
            norm_list.append({
                'name': f"词汇替换: {old_t}",
                'enabled': True,
                'search_text': old_t,
                'replacement': new_t,
                'rule_type': 'inplace',
            })
        return norm_list
    
    return [r for r in rules if r.get('enabled', True)]


def process_pdf(
    input_pdf: Optional[str] = None,
    output_pdf: Optional[str] = None,
    rules: Optional[Union[List[Dict[str, Any]], Dict[str, str]]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> str:
    """
    对 PDF 文件进行文字脱敏替换的主方法。
    全程内存中完成分析与重绘，不生成任何中间图片或临时文件。

    :param input_pdf: 输入源 PDF 文件路径。若为 None 则智能自动探测。
    :param output_pdf: 输出脱敏后的 PDF 文件路径。若为 None 则自动生成 "<原文件名>-修改.pdf"。
    :param rules: 自定义替换规则列表或简易字典。若为 None 则使用 DEFAULT_RULES。
    :param config: 基础配置字典（支持 fonts_dir 等），可覆盖 DEFAULT_CONFIG。
    :return: 处理完成后的输出文件绝对路径。
    """
    start_time = time.time()
    merged_config = dict(DEFAULT_CONFIG)
    if config:
        merged_config.update(config)
    
    target_input = input_pdf or merged_config.get('input_pdf')
    if not target_input or not os.path.exists(target_input):
        target_input = auto_detect_input_pdf()
    target_input = os.path.abspath(target_input)
    
    target_output = output_pdf or merged_config.get('output_pdf')
    if not target_output:
        dir_name, base_name = os.path.split(target_input)
        file_root, ext = os.path.splitext(base_name)
        target_output = os.path.join(dir_name, f"{file_root}-修改{ext}")
    target_output = os.path.abspath(target_output)
    
    fonts_dir = merged_config.get('fonts_dir')
    font_path_black = get_preferred_font_path('black', custom_font=merged_config.get('custom_font_black'), fonts_dir=fonts_dir)
    font_path_bold = get_preferred_font_path('bold', custom_font=merged_config.get('custom_font_bold'), fonts_dir=fonts_dir)
    font_path_medium = get_preferred_font_path('medium', custom_font=merged_config.get('custom_font_medium'), fonts_dir=fonts_dir)
    font_path_reg = get_preferred_font_path('regular', custom_font=merged_config.get('custom_font_regular'), fonts_dir=fonts_dir)
    font_path_light = get_preferred_font_path('light', custom_font=merged_config.get('custom_font_light'), fonts_dir=fonts_dir)
    
    font_paths = {
        'black': font_path_black,
        'bold': font_path_bold,
        'medium': font_path_medium,
        'regular': font_path_reg,
        'light': font_path_light,
        'font_scale': merged_config.get('font_scale', 1.0),
    }
    
    active_rules = normalize_rules(rules)
    resolved_fonts_dir = resolve_fonts_dir(fonts_dir)
    
    print('======================================================================')
    print('📄 正在执行 PDF 文字脱敏与品牌替换 (服务端模式)')
    print(f'▶ 输入文件: {target_input}')
    print(f'▶ 输出文件: {target_output}')
    print(f'📁 字体目录: {resolved_fonts_dir}')
    print(f'🔤 黑体字体: {os.path.basename(font_path_black)}')
    print(f'🔤 粗体字体: {os.path.basename(font_path_bold)}')
    print(f'🔤 中黑字体: {os.path.basename(font_path_medium)}')
    print(f'🔤 常规字体: {os.path.basename(font_path_reg)}')
    print(f'🔤 细体字体: {os.path.basename(font_path_light)}')
    print(f'📋 生效规则数: {len(active_rules)} 条')
    print('======================================================================')
    
    doc = pymupdf.open(target_input)
    total_pages = len(doc)
    total_replaced = 0
    
    print(f'🔍 正在对全部 {total_pages} 页进行动态规则扫描与重绘...')
    
    for page_idx in range(total_pages):
        page = doc[page_idx]
        page_num = page_idx + 1
        
        for rule in active_rules:
            rtype = rule.get('rule_type', 'inplace')
            if rtype == 'full_line':
                total_replaced += _handle_full_line(page, rule, font_paths, page_num)
            elif rtype == 'paragraph':
                total_replaced += _handle_paragraph(page, rule, font_paths, page_num)
            elif rtype == 'title_sampled_bg':
                total_replaced += _handle_title_sampled_bg(page, rule, font_paths, page_num)
            elif rtype == 'badge_sampled_bg':
                total_replaced += _handle_badge_sampled_bg(page, rule, font_paths, page_num)
            elif rtype == 'inplace':
                total_replaced += _handle_inplace(page, rule, font_paths, page_num)
            else:
                print(f'  [警告] 未知规则类型: {rtype}')
    
    try:
        doc.subset_fonts()
    except Exception:
        pass
    
    output_dir = os.path.dirname(target_output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    doc.save(target_output, deflate=True, garbage=4)
    doc.close()
    
    elapsed = time.time() - start_time
    file_size_mb = os.path.getsize(target_output) / (1024 * 1024)
    
    print(f'\n✨ 脱敏替换完成！共处理 {total_pages} 页，命中并替换 {total_replaced} 处特征。')
    print(f'💾 文件大小: {file_size_mb:.2f} MB，耗时: {elapsed:.2f} 秒')
    print(f'💾 文件已保存至: {target_output}')
    print('======================================================================\n')
    
    return target_output


dynamic_replace_weixunjian = process_pdf


def batch_process(
    input_paths: List[str],
    output_dir: Optional[str] = None,
    rules: Optional[Union[List[Dict[str, Any]], Dict[str, str]]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> List[str]:
    """批量处理多个 PDF 文件"""
    results = []
    print(f'🚀 开始批量处理 {len(input_paths)} 个 PDF 文件...\n')
    for idx, inp in enumerate(input_paths, 1):
        print(f'[{idx}/{len(input_paths)}] 正在处理: {inp}')
        out = None
        if output_dir:
            base_name = os.path.basename(inp)
            stem, ext = os.path.splitext(base_name)
            out = os.path.join(output_dir, f"{stem}-修改{ext}")
        try:
            res = process_pdf(inp, out, rules=rules, config=config)
            results.append(res)
        except Exception as e:
            print(f'❌ 处理文件 {inp} 失败: {e}')
    print(f'🎉 批量处理完成！成功处理 {len(results)}/{len(input_paths)} 个文件。')
    return results


def run_cli():
    """解析命令行参数并执行"""
    parser = argparse.ArgumentParser(
        description='PDF 文字脱敏与品牌替换工具 (服务端容器化 / 独立字体 / 零临时文件)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例用法:
  1. 直接使用默认/智能探测运行:
     python replace_weixunjian_to_xiangyu.py

  2. 指定单个输入与输出文件:
     python replace_weixunjian_to_xiangyu.py -i "原文件.pdf" -o "脱敏输出.pdf"

  3. 指定服务端字体目录:
     python replace_weixunjian_to_xiangyu.py -i "原文件.pdf" -o "脱敏输出.pdf" --fonts-dir "/app/fonts"

  4. 批量处理某个目录下的全部 PDF:
     python replace_weixunjian_to_xiangyu.py -b "pdftest" -o "output_dir"

  5. 兼容传统位置参数:
     python replace_weixunjian_to_xiangyu.py "原文件.pdf" "脱敏输出.pdf"
        '''
    )
    parser.add_argument('pos_input', nargs='?', default=None, help='输入源 PDF 文件路径 (位置参数)')
    parser.add_argument('pos_output', nargs='?', default=None, help='输出目标 PDF 文件路径 (位置参数)')
    parser.add_argument('-i', '--input', dest='opt_input', default=None, help='输入源 PDF 文件路径')
    parser.add_argument('-o', '--output', dest='opt_output', default=None, help='输出目标 PDF 文件路径或输出目录')
    parser.add_argument('-b', '--batch', dest='batch_dir', default=None, help='批量处理指定目录下的所有 PDF 文件')
    parser.add_argument('--fonts-dir', dest='fonts_dir', default=None, help='服务端字体目录路径 (默认读取项目内 fonts/ 目录)')
    
    args = parser.parse_args()
    
    cfg = {}
    if args.fonts_dir:
        cfg['fonts_dir'] = args.fonts_dir
    
    if args.batch_dir:
        if os.path.isdir(args.batch_dir):
            pdf_files = glob.glob(os.path.join(args.batch_dir, '*.pdf'))
            valid_pdfs = [f for f in pdf_files if not any(kw in os.path.basename(f) for kw in ('-修改', '-脱敏'))]
            if not valid_pdfs:
                print(f'❌ 目录 {args.batch_dir} 中未找到待处理的 PDF 文件！')
                sys.exit(1)
            batch_process(valid_pdfs, args.opt_output, config=cfg)
            return
        else:
            print(f'❌ 错误：{args.batch_dir} 不是有效目录！')
            sys.exit(1)
    
    input_file = args.opt_input or args.pos_input
    output_file = args.opt_output or args.pos_output
    
    try:
        process_pdf(input_file, output_file, config=cfg)
    except Exception as e:
        print(f'\n❌ 执行失败: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    if len(sys.argv) > 1:
        run_cli()
    else:
        try:
            process_pdf()
        except Exception as e:
            print(f'\n❌ 执行失败: {e}', file=sys.stderr)
            sys.exit(1)
