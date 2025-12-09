/**
 * Landing Page - Public homepage for non-authenticated users
 * Showcases the app features and design patterns
 */

'use client';

import Link from 'next/link';
import { CheckCircle2, Users, History, Layers, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold">
                Todo Patterns
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/auth/login">
                <Button variant="ghost" className="rounded-xl">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="rounded-xl">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <h2 className="text-5xl font-bold mb-6">
            Task Management with
            <br />
            <span className="text-muted-foreground">
              Design Patterns
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A powerful todo app demonstrating software design patterns:
            Composite, Command, and Observer. Built with Next.js, TypeScript, and Supabase.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="rounded-xl">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="rounded-xl" asChild>
              <a href="#features">
                Learn More
              </a>
            </Button>
          </div>
        </div>

        {/* Design Patterns Badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-20">
          <div className="px-4 py-2 bg-card border border-border rounded-full font-medium text-sm">
            Composite Pattern
          </div>
          <div className="px-4 py-2 bg-card border border-border rounded-full font-medium text-sm">
            Command Pattern
          </div>
          <div className="px-4 py-2 bg-card border border-border rounded-full font-medium text-sm">
            Observer Pattern
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="grid md:grid-cols-3 gap-6 mb-20">
          {/* Feature 1 - Composite */}
          <Card className="rounded-2xl p-8 border-border hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">
              Hierarchical Tasks
            </h3>
            <p className="text-muted-foreground mb-4">
              Create tasks and subtasks with unlimited nesting using the <strong>Composite Pattern</strong>.
              Treat individual tasks and groups uniformly.
            </p>
            <span className="text-sm font-medium">
              Pattern: Composite
            </span>
          </Card>

          {/* Feature 2 - Command */}
          <Card className="rounded-2xl p-8 border-border hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">
              Undo/Redo Actions
            </h3>
            <p className="text-muted-foreground mb-4">
              Every action is reversible with the <strong>Command Pattern</strong>.
              Full history tracking with keyboard shortcuts (Ctrl+Z / Ctrl+Y).
            </p>
            <span className="text-sm font-medium">
              Pattern: Command
            </span>
          </Card>

          {/* Feature 3 - Observer */}
          <Card className="rounded-2xl p-8 border-border hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">
              Real-time Updates
            </h3>
            <p className="text-muted-foreground mb-4">
              UI updates automatically using the <strong>Observer Pattern</strong>.
              Collaborate with team members with instant sync.
            </p>
            <span className="text-sm font-medium">
              Pattern: Observer
            </span>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center pb-20">
          <h3 className="text-3xl font-bold mb-4">
            Ready to get started?
          </h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join now and experience design patterns in action!
          </p>
          <Link href="/auth/signup">
            <Button size="lg" className="rounded-xl">
              Create Free Account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">
              Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase
            </p>
            <p className="text-sm">
              Demonstrating: Composite, Command, and Observer design patterns
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
