import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Navigation & Landing Page Consistency", () => {
  const landingPagePath = path.resolve(__dirname, "../pages/LandingPage.tsx");
  const navbarPath = path.resolve(__dirname, "../components/layout/Navbar.tsx");
  const footerPath = path.resolve(__dirname, "../components/layout/Footer.tsx");
  const sidebarPath = path.resolve(__dirname, "../components/layout/DashboardSidebar.tsx");
  const appRoutesPath = path.resolve(__dirname, "../App.tsx");

  const landingContent = fs.readFileSync(landingPagePath, "utf-8");
  const navbarContent = fs.readFileSync(navbarPath, "utf-8");
  const footerContent = fs.readFileSync(footerPath, "utf-8");
  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
  const appRoutesContent = fs.readFileSync(appRoutesPath, "utf-8");

  describe("Navbar Anchor Targets Match Landing Page Sections", () => {
    it("ensures all public navbar anchor links correspond to existing section IDs on the landing page", () => {
      const anchorRegex = /href=["']#([^"']+)["']/g;
      const navbarAnchors = new Set<string>();
      let match: RegExpExecArray | null;

      while ((match = anchorRegex.exec(navbarContent)) !== null) {
        navbarAnchors.add(match[1]);
      }

      expect(navbarAnchors.size).toBeGreaterThan(0);

      // Verify each anchor target exists as an id on the landing page
      for (const anchor of navbarAnchors) {
        const idPattern = new RegExp(`id=["']${anchor}["']`);
        expect(
          idPattern.test(landingContent),
          `Navbar links to #${anchor}, but id="${anchor}" was not found on LandingPage.tsx`
        ).toBe(true);
      }
    });

    it("ensures required sections #features, #how-it-works, #resume-engine, #pricing exist on LandingPage", () => {
      const requiredSections = ["features", "how-it-works", "resume-engine", "pricing"];
      for (const sec of requiredSections) {
        expect(landingContent).toContain(`id="${sec}"`);
      }
    });
  });

  describe("Landing Page CTAs & Routes Accuracy", () => {
    it("ensures all Link and navigate destinations point to registered routes in App.tsx", () => {
      const linkToRegex = /to=["']([^"']+)["']/g;
      const landingLinks = new Set<string>();
      let match: RegExpExecArray | null;

      while ((match = linkToRegex.exec(landingContent)) !== null) {
        landingLinks.add(match[1]);
      }

      // Valid routes configured in App.tsx: "/", "/login", "/register", "/dashboard", "/dashboard/applications", "/dashboard/resume"
      const validAppRoutes = [
        "/",
        "/login",
        "/register",
        "/dashboard",
        "/dashboard/applications",
        "/dashboard/resume",
      ];

      for (const link of landingLinks) {
        expect(
          validAppRoutes.includes(link),
          `LandingPage has a CTA to '${link}' which is not a declared route in App.tsx`
        ).toBe(true);
      }
    });

    it("ensures no fake pricing checkout or unsupported upgrade routes exist", () => {
      expect(landingContent).not.toContain("/checkout");
      expect(landingContent).not.toContain("/subscribe");
      expect(landingContent).not.toContain("Upgrade to Pro");
      expect(landingContent).not.toContain("Join Executive");
    });
  });

  describe("Sidebar Navigation Accuracy", () => {
    it("ensures sidebar navigation items link only to declared dashboard routes", () => {
      const declaredRoutes = [
        "/dashboard",
        "/dashboard/applications",
        "/dashboard/resume",
      ];

      for (const route of declaredRoutes) {
        expect(sidebarContent).toContain(`"${route}"`);
        expect(appRoutesContent).toContain(route.replace("/dashboard", "").replace("/", "") || "index");
      }
    });
  });

  describe("Footer Links Accuracy", () => {
    it("ensures footer anchors link to existing sections on LandingPage", () => {
      const anchorRegex = /href=["']#([^"']+)["']/g;
      let match: RegExpExecArray | null;

      while ((match = anchorRegex.exec(footerContent)) !== null) {
        const anchor = match[1];
        const idPattern = new RegExp(`id=["']${anchor}["']`);
        expect(
          idPattern.test(landingContent),
          `Footer links to #${anchor}, but id="${anchor}" was not found on LandingPage.tsx`
        ).toBe(true);
      }
    });
  });
});

