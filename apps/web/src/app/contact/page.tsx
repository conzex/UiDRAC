/** Contact page — Sumit Kumawat contact information. */
'use client';
import { Mail, Globe, MapPin, Github, Linkedin, Send } from 'lucide-react';
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

      <main className="flex-1 bg-bg-body py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">Get in Touch</h1>
            <p className="text-text-secondary max-w-xl mx-auto">Have a question about Universal iDRAC Console? Want to report an issue or suggest a feature? Reach out!</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-white border border-border-card rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dell-blue/10 rounded-full flex items-center justify-center"><Mail className="w-5 h-5 text-dell-blue" /></div>
                    <div><p className="text-xs text-text-secondary">Email</p><a href="mailto:hello@sumitkumawat.com" className="text-sm font-medium text-dell-blue hover:underline">hello@sumitkumawat.com</a></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dell-blue/10 rounded-full flex items-center justify-center"><Globe className="w-5 h-5 text-dell-blue" /></div>
                    <div><p className="text-xs text-text-secondary">Website</p><a href="https://www.sumitkumawat.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-dell-blue hover:underline">www.sumitkumawat.com</a></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-dell-blue/10 rounded-full flex items-center justify-center"><Github className="w-5 h-5 text-dell-blue" /></div>
                    <div><p className="text-xs text-text-secondary">GitHub</p><a href="https://github.com/sumit-kumawat" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-dell-blue hover:underline">github.com/sumit-kumawat</a></div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border-card rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4">About the Author</h2>
                <p className="text-sm text-text-secondary leading-relaxed mb-4">
                  Universal iDRAC Console is designed and built by <strong>Sumit Kumawat</strong> — a systems engineer
                  with deep experience in Dell PowerEdge server infrastructure, remote management, and enterprise automation.
                </p>
                <p className="text-sm text-text-secondary leading-relaxed">
                  This project aims to solve the real-world pain of managing mixed-generation Dell server fleets
                  without the hassle of Java plugins, ActiveX controls, or per-server browser sessions.
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white border border-border-card rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Send a Message</h2>
              {sent ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Message Prepared</h3>
                  <p className="text-sm text-text-secondary">Your email client should have opened with the message. Send it to complete.</p>
                  <button onClick={() => setSent(false)} className="mt-4 px-4 py-2 bg-dell-blue text-white text-sm rounded hover:bg-dell-blue-hover">Send Another</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="your@email.com" className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="What's this about?" className="w-full px-3 py-2 border border-border-card rounded text-sm focus:ring-2 focus:ring-dell-blue" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Message</label>
                    <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={5} placeholder="Your message..." className="w-full px-3 py-2 border border-border-card rounded text-sm resize-none focus:ring-2 focus:ring-dell-blue" />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-dell-blue text-white font-semibold rounded hover:bg-dell-blue-hover flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" /> Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
