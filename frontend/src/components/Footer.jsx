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
    <footer className="border-t border-slate-300 bg-white py-12 mt-16 text-xs text-zinc-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <img src="/brand_logo.png" alt="享宇智评" className="w-5 h-5 object-contain" />
              <span className="font-bold text-sm text-slate-900 tracking-tight">享宇智评 · XY AI Platform</span>
            </div>
            <p className="text-zinc-600 leading-relaxed text-xs">
              新一代企业信贷深度尽调平台。深度融合官方中台工商/司法合规底稿与企业经营全息档案，出具银行级全景尽调报告。
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-3 tracking-tight">核心服务能力</h4>
            <ul className="space-y-2 text-xs text-zinc-600">
              <li className="hover:text-slate-900 transition-colors cursor-pointer">市监工商与董监高治理穿透</li>
              <li className="hover:text-slate-900 transition-colors cursor-pointer">全量司法裁判与经营合规排查</li>
              <li className="hover:text-slate-900 transition-colors cursor-pointer">企业全景尽调报告与目录索引</li>
              <li className="hover:text-slate-900 transition-colors cursor-pointer">支持在线高清查阅与 PDF 原件下载</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-3 tracking-tight">合规与安全存证</h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center space-x-2 text-zinc-700">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>企业法人强实名数字授权确权机制</span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-700">
                <Lock className="w-4 h-4 text-slate-700 shrink-0" />
                <span>国密/金融级端到端加密与存证审计</span>
              </div>
              <div className="flex items-center space-x-2 text-zinc-700">
                <FileCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>官方中台与税务原件不可篡改切片</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-3 tracking-tight">机构服务与支持</h4>
            <p className="text-zinc-600">机构咨询: contact@xiangyutech.com</p>
            <p className="text-zinc-600 mt-1">服务时间: 7 × 24 小时大模型服务</p>
            <p className="text-zinc-400 mt-2 text-[11px] font-mono">增值电信业务经营许可 | 粤B2-20260826</p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-zinc-400 text-xs">
          <p>© 2026 享宇智评 XY AI Platform. All rights reserved. 四川享宇科技有限公司自研技术中台</p>
          <div className="flex space-x-6 mt-3 sm:mt-0">
            <span className="hover:text-zinc-700 cursor-pointer transition-colors">用户服务协议</span>
            <span className="hover:text-zinc-700 cursor-pointer transition-colors">隐私合规保护政策</span>
            <span className="hover:text-zinc-700 cursor-pointer transition-colors">信贷风控评级白皮书</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
