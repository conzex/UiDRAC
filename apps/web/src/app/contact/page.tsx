/** Contact page — Styled to match internal panel cards and buttons. */
'use client';
import { Mail, Globe, Github, Send } from 'lucide-react';
import PublicHeader from '@/components/layout/public-header';
import PublicFooter from '@/components/layout/public-footer';
import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:hello@sumitkumawat.com?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(`From: ${form.name} (${form.email})\n\n${form.message}`)}`;
    window.open(mailto);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-1 bg-bg-body py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h1 className="text-xl font-bold text-text-primary mb-1">Get in Touch</h1>
          <p className="text-sm text-text-secondary mb-6">Have a question about Universal iDRAC Console? Want to report an issue or suggest a feature?</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Contact Info */}
            <div className="space-y-4">
              <div className="bg-white border border-border-card rounded">
                <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
                  <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Contact Information</h2>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { Icon: Mail, label: 'Email', value: 'hello@sumitkumawat.com', href: 'mailto:hello@sumitkumawat.com' },
                    { Icon: Globe, label: 'Website', value: 'www.sumitkumawat.com', href: 'https://www.sumitkumawat.com' },
                    { Icon: Github, label: 'GitHub', value: 'github.com/sumit-kumawat', href: 'https://github.com/sumit-kumawat' },
                  ].map((item, i) => (
                    <div key={item.label} className={`flex items-center gap-3 py-2 px-2 rounded ${i % 2 === 1 ? 'bg-row-alt' : ''}`}>
                      <div className="w-8 h-8 bg-dell-blue/10 rounded flex items-center justify-center shrink-0">
                        <item.Icon className="w-4 h-4 text-dell-blue" />
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary">{item.label}</p>
                        <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-dell-blue hover:underline">{item.value}</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-border-card rounded">
                <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
                  <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">About the Author</h2>
                </div>
                <div className="p-4">
                  <p className="text-sm text-text-secondary leading-relaxed mb-3">
                    Universal iDRAC Console is designed and built by <strong className="text-text-primary">Sumit Kumawat</strong> — a systems engineer
                    with deep experience in Dell PowerEdge server infrastructure, remote management, and enterprise automation.
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    This project aims to solve the real-world pain of managing mixed-generation Dell server fleets
                    without the hassle of Java plugins, ActiveX controls, or per-server browser sessions.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white border border-border-card rounded">
              <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
                <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Send a Message</h2>
              </div>
              <div className="p-4">
                {sent ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-green-100 rounded flex items-center justify-center mx-auto mb-3">
                      <Send className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">Message Prepared</h3>
                    <p className="text-xs text-text-secondary mb-4">Your email client should have opened with the message.</p>
                    <button onClick={() => setSent(false)} className="px-4 py-2 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors">Send Another</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="your@email.com" className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Subject</label>
                      <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="What's this about?" className="w-full px-3 py-2 border border-border-card rounded text-sm focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Message</label>
                      <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={4} placeholder="Your message..." className="w-full px-3 py-2 border border-border-card rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue" />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-dell-blue text-white text-sm font-semibold rounded hover:bg-dell-blue-hover transition-colors flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
