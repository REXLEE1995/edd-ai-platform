import React from 'react';
import { useLocation } from 'react-router-dom';
import { Shield, Lock, FileCheck } from 'lucide-react';

export default function Footer() {
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname.startsWith('/share') || pathname.startsWith('/app/reports')) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 bg-white py-6 pb-20 sm:py-12 mt-6 sm:mt-16 text-xs text-zinc-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-8">
          
          {/* 1. 品牌介绍 */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center space-x-2">
              <img src="/brand_logo.png" alt="享宇AI智评" className="w-5 h-5 object-contain" />
              <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">享宇AI智评</span>
            </div>
            <p className="text-zinc-600 leading-relaxed text-xs">
              新一代企业信贷深度尽调平台。深度融合官方中台工商/司法合规底稿与企业经营全息档案，出具银行级全景尽调报告。
            </p>
          </div>

          {/* 2 & 3. 核心能力与合规存证 (在移动端 2 列并排呈现，大幅节省纵向翻页空间) */}
          <div className="grid grid-cols-2 md:contents gap-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2 sm:mb-3 tracking-tight text-xs sm:text-sm">核心服务能力</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs text-zinc-600">
                <li className="hover:text-slate-900 transition-colors cursor-pointer">市监工商治理穿透</li>
                <li className="hover:text-slate-900 transition-colors cursor-pointer">全量司法合规排查</li>
                <li className="hover:text-slate-900 transition-colors cursor-pointer">企业全景尽调报告</li>
                <li className="hover:text-slate-900 transition-colors cursor-pointer">高清 PDF 原件导出</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-2 sm:mb-3 tracking-tight text-xs sm:text-sm">合规与安全存证</h4>
              <div className="space-y-1.5 sm:space-y-2.5 text-xs">
                <div className="flex items-center space-x-1.5 text-zinc-700">
                  <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">法人强实名授权</span>
                </div>
                <div className="flex items-center space-x-1.5 text-zinc-700">
                  <Lock className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span className="truncate">国密级端到端加密</span>
                </div>
                <div className="flex items-center space-x-1.5 text-zinc-700">
                  <FileCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="truncate">官方中台防篡改</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. 机构服务与支持 */}
          <div className="space-y-1 pt-3 md:pt-0 border-t border-slate-100 md:border-0 text-xs">
            <h4 className="font-semibold text-slate-900 mb-1.5 sm:mb-3 tracking-tight text-xs sm:text-sm">机构服务与支持</h4>
            <p className="text-zinc-600">机构咨询: contact@xiangyutech.com</p>
            <p className="text-zinc-600">服务时间: 7 × 24 小时大模型服务</p>
            <p className="text-zinc-400 text-[11px] font-mono">增值电信业务经营许可 | 粤B2-20260826</p>
          </div>

        </div>

        {/* 底部版权与协议条款 */}
        <div className="pt-4 sm:pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-zinc-400 text-[11px] sm:text-xs text-center sm:text-left gap-2 sm:gap-0">
          <p>© 2026 享宇AI智评. All rights reserved. 成都享宇森云科技有限公司自研技术中台</p>
          <div className="flex space-x-4 sm:space-x-6 mt-1 sm:mt-0">
            <span className="hover:text-zinc-700 cursor-pointer transition-colors">用户服务协议</span>
            <span className="hover:text-zinc-700 cursor-pointer transition-colors">隐私合规保护政策</span>
            <span className="hover:text-zinc-700 cursor-pointer transition-colors">信贷风控评级白皮书</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
