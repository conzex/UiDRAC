/** Contact page — Styled to match internal panel cards and buttons. */
'use client';
import { Mail, Globe, Github, Send } from 'lucide-react';
import PublicChrome from '@/components/layout/public-chrome';
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
    <PublicChrome mainClassName="bg-bg-body py-10">
      <h1 className="text-xl font-bold text-text-primary mb-1">Get in Touch</h1>
      <p className="text-sm text-text-secondary mb-6">Have a question about Universal iDRAC Console? Want to report an issue or suggest a feature?</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="bg-white border border-border-card rounded">
            <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Contact Information</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded bg-dell-blue/10 text-dell-blue flex items-center justify-center shrink-0"><Mail className="w-4 h-4" /></div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">Email</div>
                  <a href="mailto:hello@sumitkumawat.com" className="text-sm text-dell-blue hover:underline">hello@sumitkumawat.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded bg-dell-blue/10 text-dell-blue flex items-center justify-center shrink-0"><Globe className="w-4 h-4" /></div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">Website</div>
                  <a href="https://www.sumitkumawat.com" target="_blank" rel="noopener noreferrer" className="text-sm text-dell-blue hover:underline">sumitkumawat.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded bg-dell-blue/10 text-dell-blue flex items-center justify-center shrink-0"><Github className="w-4 h-4" /></div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">GitHub</div>
                  <a href="https://github.com/sumit-kumawat/universal-idrac-console" target="_blank" rel="noopener noreferrer" className="text-sm text-dell-blue hover:underline">universal-idrac-console</a>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-border-card rounded p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">About the Author</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Universal iDRAC Console is developed and maintained by <strong className="text-text-primary">Sumit Kumawat</strong>.
              For enterprise deployments, custom integrations, or support inquiries, please reach out via email.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white border border-border-card rounded">
          <div className="bg-card-header px-4 py-2.5 border-b border-border-card">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-text-primary">Send a Message</h2>
          </div>
          <div className="p-4">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-green-50 text-green-healthy flex items-center justify-center mx-auto mb-3"><Send className="w-5 h-5" /></div>
                <p className="text-sm font-semibold text-text-primary mb-1">Message Ready</p>
                <p className="text-sm text-text-secondary">Your email client should open with the message pre-filled.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
    </PublicChrome>
  );
}
