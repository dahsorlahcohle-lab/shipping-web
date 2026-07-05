import React, { useState, useEffect } from "react";
import {
  Truck,
  Search,
  Lock,
  MapPin,
  Clock,
  Plus,
  LogOut,
  CheckCircle2,
  Package,
  ArrowRight,
  Clipboard,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Building2,
  X,
  Globe,
  Shield,
  Mail,
  Phone,
  Github,
  Twitter,
  Linkedin,
  Menu
} from "lucide-react";
import { motion } from "motion/react";

import publicBg from "./assets/images/public_bg_1782944622602.jpg";
import adminBg from "./assets/images/admin_bg_1782944635725.jpg";

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
}

interface Shipment {
  id: string;
  trackingId: string;
  origin: string;
  destination: string;
  carrierService: string;
  status: "Pending" | "In Transit" | "Out for Delivery" | "Delivered";
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export default function App() {
  // Navigation State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Public Tracker States
  const [trackingIdInput, setTrackingIdInput] = useState("");
  const [searchedShipment, setSearchedShipment] = useState<Shipment | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  // Admin Login States
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Dashboard States
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create Shipment Form States
  const [newOrigin, setNewOrigin] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newCarrier, setNewCarrier] = useState("");
  const [newStatus, setNewStatus] = useState<Shipment["status"]>("Pending");
  const [createSuccess, setCreateSuccess] = useState<{ trackingId: string } | null>(null);
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Routing Handler
  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    setCurrentPath(path);
    setMobileMenuOpen(false);
  };

  // Contact Form States
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSuccess, setContactSuccess] = useState(false);

  // Service Modal/Details State
  const [activeService, setActiveService] = useState<{
    title: string;
    description: string;
    details: string;
    icon: React.ReactNode;
  } | null>(null);

  // Resource Modal/Details State
  const [activeResource, setActiveResource] = useState<{
    title: string;
    description: string;
    details: string;
  } | null>(null);

  // Supabase connection status states
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    ok: boolean;
    error: string | null;
  } | null>(null);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Scroll Helper
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Check Session Status on mount and route changes
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
    } catch (err) {
      console.error("Auth check failed:", err);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  const checkSupabaseStatus = async () => {
    try {
      const res = await fetch("/api/supabase-status");
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error("Failed to check Supabase status:", err);
    }
  };

  useEffect(() => {
    checkAuth();
    checkSupabaseStatus();
  }, [currentPath]);

  // Load Shipments for Admin Dashboard
  const fetchAdminShipments = async () => {
    if (!isAuthenticated) return;
    setDashboardLoading(true);
    try {
      const res = await fetch("/api/admin/shipments");
      if (res.ok) {
        const data = await res.json();
        setShipments(data);
      }
    } catch (err) {
      console.error("Failed to fetch shipments:", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (currentPath === "/admin/dashboard" && isAuthenticated) {
      fetchAdminShipments();
    }
  }, [currentPath, isAuthenticated]);

  // Redirect Logic based on authentication
  useEffect(() => {
    if (!authLoading) {
      if (currentPath === "/admin/dashboard" && isAuthenticated === false) {
        navigate("/admin/login");
      } else if (currentPath === "/admin/login" && isAuthenticated === true) {
        navigate("/admin/dashboard");
      }
    }
  }, [currentPath, isAuthenticated, authLoading]);

  // Handle Public Search
  const handleSearch = async (idToSearch?: string) => {
    const query = idToSearch || trackingIdInput;
    if (!query.trim()) return;

    setSearchLoading(true);
    setSearchError("");
    setSearchedShipment(null);

    try {
      const res = await fetch(`/api/shipments/${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchedShipment(data);
      } else {
        const errorData = await res.json();
        setSearchError(errorData.error || "Shipment not found.");
      }
    } catch (err) {
      setSearchError("Unable to connect to the tracking service. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle Admin Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthenticated(true);
        navigate("/admin/dashboard");
      } else {
        setLoginError(data.error || "Invalid password");
      }
    } catch (err) {
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      if (res.ok) {
        setIsAuthenticated(false);
        navigate("/admin/login");
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Handle Create Shipment
  const handleCreateShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrigin || !newDestination || !newCarrier) {
      setCreateError("Please fill out all fields.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");
    setCreateSuccess(null);

    try {
      const res = await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: newOrigin,
          destination: newDestination,
          carrierService: newCarrier,
          status: newStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCreateSuccess(data);
        // Reset fields
        setNewOrigin("");
        setNewDestination("");
        setNewCarrier("");
        setNewStatus("Pending");
        // Reload list
        fetchAdminShipments();
      } else {
        const errData = await res.json();
        setCreateError(errData.error || "Failed to create shipment.");
      }
    } catch (err) {
      setCreateError("Connection error. Failed to create shipment.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Update Status of existing shipment
  const handleStatusUpdate = async (trackingId: string, status: Shipment["status"]) => {
    try {
      const res = await fetch(`/api/admin/shipments/${encodeURIComponent(trackingId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        // Refresh shipments
        fetchAdminShipments();
      } else {
        console.error("Failed to update status");
      }
    } catch (err) {
      console.error("Connection error updating status:", err);
    }
  };

  // Copy tracking ID helper
  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format Dates beautifully
  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  // Get status style helper
  const getStatusBadge = (status: Shipment["status"]) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Transit":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Out for Delivery":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Filter shipments based on search query in the admin table
  const filteredShipments = shipments.filter((s) => {
    const q = adminSearchQuery.toUpperCase().trim();
    if (!q) return true;
    return (
      s.trackingId.toUpperCase().includes(q) ||
      s.origin.toUpperCase().includes(q) ||
      s.destination.toUpperCase().includes(q) ||
      s.carrierService.toUpperCase().includes(q)
    );
  });

  const isAdminPath = currentPath === "/admin/login" || currentPath === "/admin/dashboard";
  const bgImage = isAdminPath ? adminBg : publicBg;

  return (
    <div
      className="min-h-screen text-slate-900 font-sans flex flex-col antialiased transition-all duration-500 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="p-2 bg-blue-600 rounded-lg text-white group-hover:bg-blue-500 transition-all shadow-md shadow-blue-500/20">
              <Truck size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight select-none">
              Paramount <span className="text-blue-400 font-normal">Maritime</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {currentPath !== "/admin/login" && currentPath !== "/admin/dashboard" && (
              <div className="flex items-center gap-5 mr-2">
                <button
                  onClick={() => scrollToSection("services")}
                  className="text-slate-300 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Services
                </button>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-slate-300 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("resources")}
                  className="text-slate-300 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Resources
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-slate-300 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </div>
            )}

            <button
              onClick={() => navigate("/")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                currentPath !== "/admin/login" && currentPath !== "/admin/dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Public Tracker
            </button>

            {isAuthenticated && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/admin/dashboard")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    currentPath === "/admin/dashboard"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <ShieldCheck size={16} />
                  Console
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 text-sm font-medium transition-all flex items-center gap-1.5"
                  id="btn-logout"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            )}
          </nav>

          {/* Mobile Navigation Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && currentPath === "/admin/dashboard" && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 text-white animate-fade-in z-50">
          <div className="px-4 pt-2 pb-6 space-y-3 flex flex-col">
            {currentPath !== "/admin/login" && currentPath !== "/admin/dashboard" && (
              <>
                <button
                  onClick={() => scrollToSection("services")}
                  className="text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all"
                >
                  Services
                </button>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("resources")}
                  className="text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all"
                >
                  Resources
                </button>
                <button
                  onClick={() => scrollToSection("contact")}
                  className="text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all"
                >
                  Contact
                </button>
                <hr className="border-slate-800 my-1" />
              </>
            )}

            <button
              onClick={() => navigate("/")}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                currentPath !== "/admin/login" && currentPath !== "/admin/dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              Public Tracker
            </button>

            {isAuthenticated ? (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => navigate("/admin/dashboard")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    currentPath === "/admin/dashboard"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <ShieldCheck size={16} />
                  Console Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-slate-800 text-sm font-semibold transition-all flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/admin/login")}
                className="w-full text-left px-3 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
              >
                <Lock size={16} />
                Admin Login Portal
              </button>
            )}
          </div>
        </div>
      )}

      {/* Supabase Error Alert Banner */}
      {supabaseStatus && !supabaseStatus.ok && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 sm:px-6 lg:px-8 z-40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Supabase Database Sync Alert</p>
                <p className="text-xs text-amber-800 font-medium">
                  The 'shipments' table is not available in your Supabase schema yet (Error: {supabaseStatus.error}).
                  The app is safely using its local failsafe database (fully functional).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
              <button
                onClick={() => setShowSqlGuide(!showSqlGuide)}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm"
              >
                {showSqlGuide ? "Hide Setup Guide" : "View SQL Setup Guide"}
              </button>
            </div>
          </div>

          {/* Collapsible SQL Setup Guide */}
          {showSqlGuide && (
            <div className="max-w-7xl mx-auto mt-4 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden text-slate-300 animate-fade-in p-4 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-sm text-white">How to initialize your Supabase Database:</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id VARCHAR(255) UNIQUE NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    carrier_service TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking_id ON shipments(tracking_id);

ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;`);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 2000);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5"
                >
                  {sqlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                  <span>{sqlCopied ? "SQL Copied!" : "Copy SQL Script"}</span>
                </button>
              </div>
              <p className="text-xs leading-relaxed">
                1. Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Supabase Dashboard</a>.<br />
                2. Click on the <strong>SQL Editor</strong> tab on the left sidebar.<br />
                3. Click <strong>New Query</strong>, paste the script below, and click <strong>Run</strong>.<br />
                4. Once the query runs successfully, return here and refresh the page to connect to your real-time database.
              </p>
              <pre className="bg-slate-950 p-4 rounded-lg overflow-x-auto text-xs text-emerald-400 font-mono border border-slate-800">
{`CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id VARCHAR(255) UNIQUE NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    carrier_service TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking_id ON shipments(tracking_id);

ALTER TABLE shipments DISABLE ROW LEVEL SECURITY;`}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Main Core View Area */}
      <main className="flex-1 flex flex-col">
        {authLoading ? (
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-slate-500 text-sm">Synchronizing core systems...</span>
          </div>
        ) : (
          <>
            {/* PUBLIC TRACKING VIEW */}
            {currentPath !== "/admin/login" && currentPath !== "/admin/dashboard" && (
              <div className="w-full flex flex-col">
                <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 animate-fade-in">
                {/* Intro Hero Card */}
                <div className="text-center space-y-3 py-4">
                  <h1 
                    className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight"
                    style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6)" }}
                  >
                    Real-Time Shipment Journey
                  </h1>
                  <p 
                    className="text-slate-100 max-w-lg mx-auto text-sm sm:text-base font-medium"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.6)" }}
                  >
                    Enter your high-precision tracking number to fetch the continuous route, current status history, and carriers.
                  </p>
                </div>

                {/* Main Search Bar Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Enter tracking ID (e.g. TRK-2026-A4B2)"
                        value={trackingIdInput}
                        onChange={(e) => setTrackingIdInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400 pl-11 pr-4 py-3 rounded-xl outline-none transition-all font-medium"
                        id="input-tracking"
                      />
                    </div>
                    <button
                      onClick={() => handleSearch()}
                      disabled={searchLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50 w-full sm:w-auto shrink-0"
                      id="btn-track-submit"
                    >
                      {searchLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Search size={18} />
                          <span>Track Shipment</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Sample tracking IDs to ease testing */}
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium">Quick Sandbox Terminals:</span>
                    <button
                      onClick={() => {
                        setTrackingIdInput("TRK-2026-H7K9");
                        handleSearch("TRK-2026-H7K9");
                      }}
                      className="bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 px-2.5 py-1 rounded-md transition-colors font-semibold"
                    >
                      TRK-2026-H7K9 (Transit)
                    </button>
                    <button
                      onClick={() => {
                        setTrackingIdInput("TRK-2026-A4B2");
                        handleSearch("TRK-2026-A4B2");
                      }}
                      className="bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 px-2.5 py-1 rounded-md transition-colors font-semibold"
                    >
                      TRK-2026-A4B2 (Delivered)
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {searchError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex gap-3 items-start animate-fade-in">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold">Tracking Inquiry Error</p>
                      <p className="opacity-90">{searchError}</p>
                    </div>
                  </div>
                )}

                {/* TRACKING DETAILS DISPLAY */}
                {searchedShipment && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in" id="card-tracking-results">
                    {/* Upper Status Accent Header */}
                    <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-400 tracking-wider uppercase font-display">Tracking Identity</span>
                          <button
                            onClick={() => copyToClipboard(searchedShipment.trackingId)}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Copy Tracking ID"
                          >
                            {copiedId === searchedShipment.trackingId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Clipboard className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <h2 className="text-2xl font-bold font-display tracking-tight text-white mt-0.5">
                          {searchedShipment.trackingId}
                        </h2>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <span className="text-xs text-slate-400">Current Phase</span>
                        <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(searchedShipment.status)} shadow-sm`}>
                          {searchedShipment.status}
                        </span>
                      </div>
                    </div>

                    {/* Meta Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50 p-6 gap-6 md:gap-0">
                      <div className="md:px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Origin Warehouse</span>
                        <div className="flex items-start gap-2 mt-1.5">
                          <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span className="font-semibold text-slate-800 text-sm leading-relaxed">{searchedShipment.origin}</span>
                        </div>
                      </div>

                      <div className="md:px-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Destination Address</span>
                        <div className="flex items-start gap-2 mt-1.5">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="font-semibold text-slate-800 text-sm leading-relaxed">{searchedShipment.destination}</span>
                        </div>
                      </div>

                      <div className="md:px-6">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Carrier Service</span>
                        <div className="flex items-start gap-2 mt-1.5">
                          <Building2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                          <span className="font-semibold text-slate-800 text-sm leading-relaxed">{searchedShipment.carrierService}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Log Section */}
                    <div className="p-6 sm:p-8 space-y-6">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Shipment Journey History
                      </h3>

                      <div className="relative border-l-2 border-slate-100 pl-6 sm:pl-8 space-y-8 py-2">
                        {searchedShipment.statusHistory.map((history, idx) => {
                          const isLatest = idx === searchedShipment.statusHistory.length - 1;
                          return (
                            <div key={idx} className="relative group">
                              {/* Indicator Node Dot */}
                              <div
                                className={`absolute -left-[31px] sm:-left-[39px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all ${
                                  isLatest
                                    ? "border-blue-600 scale-125 shadow-md shadow-blue-500/20"
                                    : "border-slate-300"
                                }`}
                              >
                                {isLatest && (
                                  <span className="absolute inset-0.5 bg-blue-600 rounded-full animate-pulse" />
                                )}
                              </div>

                              {/* Log Block */}
                              <div className="space-y-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                                  <span className={`font-semibold text-sm sm:text-base ${isLatest ? "text-slate-900 font-bold" : "text-slate-600"}`}>
                                    {history.status}
                                  </span>
                                  {isLatest && (
                                    <span className="inline-flex self-start sm:self-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                                      Latest Milestone
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDate(history.timestamp)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* --- MARKETING EXPANSION SECTIONS --- */}
              
              {/* 1. Trust Stats Strip */}
              <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl shadow-sm p-6"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    <div className="flex flex-col items-center justify-center pt-0">
                      <span className="font-display font-extrabold text-3xl text-blue-600">150+</span>
                      <span className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wide mt-1.5">Countries Served</span>
                    </div>
                    <div className="flex flex-col items-center justify-center pt-4 md:pt-0">
                      <span className="font-display font-extrabold text-3xl text-blue-600">2M+</span>
                      <span className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wide mt-1.5">Packages Delivered</span>
                    </div>
                    <div className="flex flex-col items-center justify-center pt-4 md:pt-0">
                      <span className="font-display font-extrabold text-3xl text-blue-600">98.7%</span>
                      <span className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wide mt-1.5">On-Time Rate</span>
                    </div>
                    <div className="flex flex-col items-center justify-center pt-4 md:pt-0">
                      <span className="font-display font-extrabold text-3xl text-blue-600">24/7</span>
                      <span className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wide mt-1.5">Live Support</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="w-full bg-white border-t border-slate-200 mt-16 text-slate-850">
                {/* 2. Services Section */}
                <section id="services" className="py-16 sm:py-24 border-b border-slate-100 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-display">Logistics Capabilities</span>
                      <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                        What We Ship
                      </h2>
                      <p className="text-slate-500 text-sm sm:text-base font-medium">
                        Comprehensive global freight forwarding, warehousing, and parcel logistics designed to simplify your supply chain.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                      {/* Express Delivery Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-slate-50/80 rounded-2xl border border-slate-200/60 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-5">
                            <Clock size={24} className="stroke-[2]" />
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Express Delivery</h3>
                          <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Next-day and time-critical delivery options for urgent documents and parcels worldwide.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveService({
                            title: "Express Delivery",
                            description: "Next-day and time-critical delivery options for urgent documents and parcels worldwide.",
                            details: "Our express global network operates 24/7 to guarantee your high-priority items arrive on schedule. Features real-time tracking checkpoints, direct air routing, signature verification, and secure handling from pickup to final door-to-door delivery.",
                            icon: <Clock size={24} />
                          })}
                          className="text-blue-600 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start text-sm"
                        >
                          <span>Learn More</span>
                          <ChevronRight size={16} />
                        </button>
                      </motion.div>

                      {/* Ground Freight Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-50/80 rounded-2xl border border-slate-200/60 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-5">
                            <Truck size={24} className="stroke-[2]" />
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Ground Freight</h3>
                          <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Reliable and cost-effective overland transportation for large bulk cargo, machinery, and commercial freight.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveService({
                            title: "Ground Freight",
                            description: "Reliable and cost-effective overland transportation for large bulk cargo, machinery, and commercial freight.",
                            details: "Comprehensive Less-Than-Truckload (LTL) and Full-Truckload (FTL) services across all regions. Equipped with climate-controlled cabins, automated logistics routing, and robust cargo insurance, ensuring maximum stability and security for high-volume cargo.",
                            icon: <Truck size={24} />
                          })}
                          className="text-blue-600 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start text-sm"
                        >
                          <span>Learn More</span>
                          <ChevronRight size={16} />
                        </button>
                      </motion.div>

                      {/* International Shipping Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-50/80 rounded-2xl border border-slate-200/60 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-5">
                            <Globe size={24} className="stroke-[2]" />
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-900 mb-2">International Shipping</h3>
                          <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Seamless cross-border customs clearance, freight forwarding, and ocean or air delivery logistics.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveService({
                            title: "International Shipping",
                            description: "Seamless cross-border customs clearance, freight forwarding, and ocean or air delivery logistics.",
                            details: "Navigating international trade is complex. Paramount Maritime handles customs documentation, port authority filings, tariff compliance, and global carrier handoffs across 150+ countries so your international shipping flows smoothly.",
                            icon: <Globe size={24} />
                          })}
                          className="text-blue-600 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start text-sm"
                        >
                          <span>Learn More</span>
                          <ChevronRight size={16} />
                        </button>
                      </motion.div>

                      {/* Warehousing Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-slate-50/80 rounded-2xl border border-slate-200/60 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
                      >
                        <div>
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit mb-5">
                            <Building2 size={24} className="stroke-[2]" />
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-900 mb-2">Warehousing & Fulfillment</h3>
                          <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Secure, state-of-the-art storage, inventory management, and fast pick-and-pack retail services.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveService({
                            title: "Warehousing & Fulfillment",
                            description: "Secure, state-of-the-art storage, inventory management, and fast pick-and-pack retail services.",
                            details: "Our smart warehouses utilize advanced automated scanning and real-time inventory systems. We provide picking, packing, custom labeling, and last-mile dispatch support for e-commerce and industrial clients looking to scale seamlessly.",
                            icon: <Building2 size={24} />
                          })}
                          className="text-blue-600 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all cursor-pointer self-start text-sm"
                        >
                          <span>Learn More</span>
                          <ChevronRight size={16} />
                        </button>
                      </motion.div>
                    </div>
                  </div>
                </section>

                {/* 3. How It Works Section */}
                <section className="py-16 sm:py-24 border-b border-slate-100 bg-slate-50">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-display">Workflow Model</span>
                      <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                        Simple & Seamless Logistics
                      </h2>
                      <p className="text-slate-500 text-sm sm:text-base font-medium">
                        From submission to final confirmation, our systematic milestones keep you connected.
                      </p>
                    </div>

                    <div className="relative">
                      {/* Connecting Line (Desktop Only) */}
                      <div className="hidden lg:block absolute top-6 left-[15%] right-[15%] h-0.5 bg-blue-100" />

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 relative z-10">
                        {/* Step 1 */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          className="flex flex-col items-center text-center space-y-4 px-4"
                        >
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-extrabold text-lg shadow-md shadow-blue-500/25">
                            1
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-900">Enter Tracking ID</h3>
                          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                            Input your Paramount identifier in the tracker above.
                          </p>
                        </motion.div>

                        {/* Step 2 */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.15 }}
                          className="flex flex-col items-center text-center space-y-4 px-4"
                        >
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-extrabold text-lg shadow-md shadow-blue-500/25">
                            2
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-900">Get Real-Time Updates</h3>
                          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                            Receive continuous route maps and milestone histories.
                          </p>
                        </motion.div>

                        {/* Step 3 */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 }}
                          className="flex flex-col items-center text-center space-y-4 px-4"
                        >
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white font-extrabold text-lg shadow-md shadow-blue-500/25">
                            3
                          </div>
                          <h3 className="font-display font-bold text-lg text-slate-900">Delivery Confirmed</h3>
                          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                            Secure door-to-door signature verification upon arrival.
                          </p>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. Resources Section */}
                <section id="resources" className="py-16 sm:py-24 border-b border-slate-100 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-display">Compliance Guides</span>
                      <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                        Shipping Resources
                      </h2>
                      <p className="text-slate-500 text-sm sm:text-base font-medium">
                        A collection of tools, declarations, and manuals to keep your global logistics fully compliant.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Resource 1 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-4">
                          <h3 className="font-display font-bold text-lg text-slate-950">International Shipping Basics</h3>
                          <p className="text-slate-500 text-sm leading-relaxed">
                            Learn the essential terms, regulations, and timelines for shipping commercial products across borders.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveResource({
                            title: "International Shipping Basics",
                            description: "Learn the essential terms, regulations, and timelines for shipping commercial products across borders.",
                            details: "Comprehensive guide covering Incoterms (CIF, FOB, EXW), international commercial invoices, tariff lookups, and calculating landed costs for various regions."
                          })}
                          className="text-blue-600 font-bold text-sm hover:underline mt-6 inline-flex items-center gap-1 cursor-pointer self-start"
                        >
                          <span>Learn More &gt;</span>
                        </button>
                      </motion.div>

                      {/* Resource 2 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-4">
                          <h3 className="font-display font-bold text-lg text-slate-950">Customs & Documentation</h3>
                          <p className="text-slate-500 text-sm leading-relaxed">
                            A comprehensive guide to commercial invoices, certificates of origin, and custom declarations.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveResource({
                            title: "Customs & Documentation",
                            description: "A comprehensive guide to commercial invoices, certificates of origin, and custom declarations.",
                            details: "Detailed analysis of custom declarations, harmonized tariff codes (HS Codes), power of attorney documents, and compliance forms for major shipping lanes."
                          })}
                          className="text-blue-600 font-bold text-sm hover:underline mt-6 inline-flex items-center gap-1 cursor-pointer self-start"
                        >
                          <span>Learn More &gt;</span>
                        </button>
                      </motion.div>

                      {/* Resource 3 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-4">
                          <h3 className="font-display font-bold text-lg text-slate-950">Packaging Guidelines</h3>
                          <p className="text-slate-500 text-sm leading-relaxed">
                            How to properly pack, cushion, and label heavy cargo or delicate electronic items to prevent transit wear.
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveResource({
                            title: "Packaging Guidelines",
                            description: "How to properly pack, cushion, and label heavy cargo or delicate electronic items to prevent transit wear.",
                            details: "Expert packaging standards including double-wall corrugated boxing, specific cushioning parameters, secure shrink-wrapping, palletizing guidelines, and optimal label positioning."
                          })}
                          className="text-blue-600 font-bold text-sm hover:underline mt-6 inline-flex items-center gap-1 cursor-pointer self-start"
                        >
                          <span>Learn More &gt;</span>
                        </button>
                      </motion.div>
                    </div>
                  </div>
                </section>

                {/* 5. About the Company Section */}
                <section id="about" className="py-16 sm:py-24 border-b border-slate-100 bg-slate-50">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                      {/* Left Info Column */}
                      <motion.div
                        initial={{ opacity: 0, x: -25 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                      >
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-display">About Paramount</span>
                        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                          Built on Trust, Delivered on Time
                        </h2>
                        <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
                          For over 15 years, Paramount Maritime has been at the forefront of global logistics, bridging continents with unparalleled reliability. We treat every parcel as a vital link in our clients' supply chains, engineering smart routes to reduce transit friction and secure cargo.
                        </p>

                        <div className="space-y-3 pt-2">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-sm font-semibold text-slate-700">15+ Years of Logistics Experience</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-sm font-semibold text-slate-700">Global Carrier Network in 150+ Countries</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-sm font-semibold text-slate-700">Secure Chain-of-Custody on Every Shipment</span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Right HUD Column */}
                      <motion.div
                        initial={{ opacity: 0, x: 25 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="h-full"
                      >
                        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-3xl overflow-hidden aspect-video lg:aspect-auto lg:h-full min-h-[340px] border border-slate-800 shadow-xl flex flex-col justify-between p-6">
                          {/* Tech HUD decorative markers */}
                          <div className="flex justify-between items-center text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                            <span>System: PM-OPS-v4.2</span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Secure Link
                            </span>
                          </div>
                          
                          {/* Centered Graphic */}
                          <div className="my-auto flex flex-col items-center justify-center gap-4 py-8">
                            <div className="relative p-6 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full shadow-inner animate-pulse">
                              <Truck size={48} className="stroke-[1.5]" />
                            </div>
                            <div className="text-center">
                              <p className="font-display font-extrabold text-xl text-white tracking-tight">Paramount Global Logistics</p>
                              <p className="text-slate-400 text-xs font-mono mt-1">Operational Coordinates Locked</p>
                            </div>
                          </div>

                          {/* Footer details */}
                          <div className="flex justify-between text-slate-500 font-mono text-[9px]">
                            <span>LAT: 51.5074° N</span>
                            <span>LNG: 0.1278° W</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </section>

                {/* 6. Testimonials Strip */}
                <section className="py-16 sm:py-24 border-b border-slate-100 bg-white">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-display">Client Endorsements</span>
                      <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                        Endorsed by Global Enterprise
                      </h2>
                      <p className="text-slate-500 text-sm sm:text-base font-medium">
                        See how our commitment to precision impacts businesses of all scales.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Testimonial 1 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-slate-50 rounded-2xl border border-slate-200/80 p-8 space-y-6 shadow-sm hover:shadow-md transition-all"
                      >
                        <p className="text-slate-600 italic text-sm sm:text-base leading-relaxed">
                          "Paramount Maritime cut our delivery delays in half. Their live status checkpoint updates are remarkably precise."
                        </p>
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            AO
                          </div>
                          <div>
                            <p className="text-slate-950 font-bold text-sm">Amaka O.</p>
                            <p className="text-slate-500 text-xs font-medium">Retail Ops Lead, Velo Fashion</p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Testimonial 2 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-slate-50 rounded-2xl border border-slate-200/80 p-8 space-y-6 shadow-sm hover:shadow-md transition-all"
                      >
                        <p className="text-slate-600 italic text-sm sm:text-base leading-relaxed">
                          "Crucial medical supplies reached their destination with seamless customs clearance. Truly professional service."
                        </p>
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            HB
                          </div>
                          <div>
                            <p className="text-slate-950 font-bold text-sm">Hans B.</p>
                            <p className="text-slate-500 text-xs font-medium">Logistics Director, MedGroup Global</p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Testimonial 3 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-50 rounded-2xl border border-slate-200/80 p-8 space-y-6 shadow-sm hover:shadow-md transition-all"
                      >
                        <p className="text-slate-600 italic text-sm sm:text-base leading-relaxed">
                          "The level of care and chain-of-custody security they maintain for our industrial machinery is unparalleled."
                        </p>
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            SK
                          </div>
                          <div>
                            <p className="text-slate-950 font-bold text-sm">Sarah K.</p>
                            <p className="text-slate-500 text-xs font-medium">COO, Apex Manufacturing</p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </section>

                {/* Elegant Contact Form Section */}
                <section id="contact" className="py-16 sm:py-24 bg-slate-50 border-b border-slate-200/50">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      {/* Info Column */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                      >
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-display">Get In Touch</span>
                        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
                          Connect with Paramount Support
                        </h2>
                        <p className="text-slate-500 text-sm sm:text-base leading-relaxed font-medium">
                          Have questions about customs, warehousing, or transit parameters? Our dedicated operations center handles inquiries 24 hours a day.
                        </p>

                        <div className="space-y-4 pt-4">
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                              <MapPin size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Headquarters</p>
                              <p className="text-sm font-semibold text-slate-700">100 Maritime Plaza, Suite 400, London, EC3V 3ND</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                              <Mail size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Support</p>
                              <p className="text-sm font-semibold text-slate-700">ops@paramountmaritime.com</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3.5">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                              <Phone size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Support Hotline</p>
                              <p className="text-sm font-semibold text-slate-700">+44 (0) 20 7946 0192</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Message Form Column */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm"
                      >
                        {contactSuccess ? (
                          <div className="space-y-4 text-center py-8">
                            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <CheckCircle2 size={28} />
                            </div>
                            <h3 className="font-display font-bold text-xl text-slate-900">Inquiry Received</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">
                              Thank you for contacting us. A Paramount logistics representative will review your message and respond within 2 hours.
                            </p>
                            <button
                              onClick={() => {
                                setContactSuccess(false);
                                setContactName("");
                                setContactEmail("");
                                setContactMessage("");
                              }}
                              className="text-blue-600 text-xs font-bold hover:underline"
                            >
                              Send another message
                            </button>
                          </div>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              setContactSuccess(true);
                            }}
                            className="space-y-4"
                          >
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                              <input
                                type="text"
                                placeholder="Amaka Okezie"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 px-4 py-2.5 rounded-xl outline-none transition-all font-medium text-sm focus:bg-white"
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                              <input
                                type="email"
                                placeholder="amaka@velofashion.com"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 px-4 py-2.5 rounded-xl outline-none transition-all font-medium text-sm focus:bg-white"
                                required
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</label>
                              <textarea
                                placeholder="Describe your inquiry, volume parameters, or customs specifications..."
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 px-4 py-2.5 rounded-xl outline-none transition-all font-medium text-sm resize-none focus:bg-white"
                                required
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md text-sm cursor-pointer"
                            >
                              Submit Secure Message
                            </button>
                          </form>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </section>

                {/* 7. CTA Banner */}
                <section className="bg-slate-900 text-white border-t border-slate-950 py-16 sm:py-20 text-center relative overflow-hidden">
                  {/* Glowing effect */}
                  <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
                    <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-white">
                      Ready to Ship With Confidence?
                    </h2>
                    <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                      Experience the Paramount speed and real-time transit precision today.
                    </p>
                    <button
                      onClick={() => {
                        const inputElement = document.getElementById("input-tracking");
                        if (inputElement) {
                          inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
                          inputElement.focus();
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 inline-flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
                    >
                      <Search size={18} />
                      <span>Track a Shipment</span>
                    </button>
                  </div>
                </section>
              </div>

              {/* Service Detail Modal */}
              {activeService && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
                  <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-scale-up">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                          {activeService.icon}
                        </div>
                        <h3 className="font-display font-bold text-xl text-slate-900">{activeService.title}</h3>
                      </div>
                      <button 
                        onClick={() => setActiveService(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-slate-600 font-medium text-sm leading-relaxed">{activeService.description}</p>
                      <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5 font-display">Service Overview & Capabilities</h4>
                        <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-sans font-medium">{activeService.details}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => setActiveService(null)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all cursor-pointer"
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Resource Detail Modal */}
              {activeResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
                  <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-scale-up">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-display font-bold text-xl text-slate-900">{activeResource.title}</h3>
                      <button 
                        onClick={() => setActiveResource(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-slate-600 font-medium text-sm leading-relaxed">{activeResource.description}</p>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-display">Industry Guide Excerpt</h4>
                        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-sans font-medium">{activeResource.details}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => setActiveResource(null)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all cursor-pointer"
                      >
                        Close Guide
                      </button>
                    </div>
                  </div>
                </div>
              )}

              </div>
            )}

            {/* ADMIN LOGIN VIEW */}
            {currentPath === "/admin/login" && (
              <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 flex-1 flex flex-col justify-center">
                <div className="max-w-md mx-auto w-full animate-fade-in">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 space-y-6">
                    {/* Lock Shield Logo */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                        <Lock size={24} className="stroke-[2.5]" />
                      </div>
                      <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                        Admin Portal
                      </h2>
                      <p className="text-slate-500 text-xs">
                        Enter your master credential token to access shipment logistics, creation engines, and statuses.
                      </p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleLoginSubmit} className="space-y-4" id="form-login">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Master Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 pl-4 pr-4 py-3 rounded-xl outline-none transition-all font-mono text-sm"
                          required
                          id="input-password"
                        />
                      </div>

                      {loginError && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex gap-2 items-center text-xs animate-shake">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                        id="btn-login-submit"
                      >
                        {loginLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Lock size={16} />
                            <span>Verify Console Access</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN DASHBOARD VIEW */}
            {currentPath === "/admin/dashboard" && isAuthenticated && (
              <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1">
                <div className="space-y-8 animate-fade-in" id="panel-admin-dashboard">
                {/* Stats Header Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-blue-600 tracking-wider uppercase font-display block">System Status Console</span>
                    <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight mt-0.5">
                      Logistics Control
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-center min-w-[90px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shipments</span>
                      <span className="text-xl font-bold text-slate-800">{shipments.length}</span>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 px-4 py-2 rounded-xl text-center min-w-[90px]">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">In Transit</span>
                      <span className="text-xl font-bold text-blue-700">
                        {shipments.filter((s) => s.status === "In Transit").length}
                      </span>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 px-4 py-2 rounded-xl text-center min-w-[90px]">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Delivered</span>
                      <span className="text-xl font-bold text-emerald-700">
                        {shipments.filter((s) => s.status === "Delivered").length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Grid split between Create Form and Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Create Shipment Card */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                      <div className="border-b border-slate-100 pb-3">
                        <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-1.5">
                          <Plus className="text-blue-600 w-5 h-5 shrink-0" />
                          Create Shipment
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Initialize a new package routing identifier</p>
                      </div>

                      {createSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 space-y-2 animate-fade-in">
                          <div className="flex gap-2 items-start text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">Creation Succeeded</p>
                              <p className="opacity-95 text-xs">Tracking ID generated & seeded in central catalog.</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-white border border-emerald-100 p-2 rounded-lg text-xs font-mono">
                            <span className="font-bold text-emerald-800 select-all">{createSuccess.trackingId}</span>
                            <button
                              onClick={() => copyToClipboard(createSuccess.trackingId)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                            >
                              {copiedId === createSuccess.trackingId ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Clipboard className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {createError && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex gap-2 items-center text-xs animate-shake">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{createError}</span>
                        </div>
                      )}

                      <form onSubmit={handleCreateShipmentSubmit} className="space-y-4" id="form-create-shipment">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Origin Warehouse
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Chicago, IL"
                            value={newOrigin}
                            onChange={(e) => setNewOrigin(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 pl-3 pr-3 py-2 rounded-lg outline-none transition-all text-sm"
                            required
                            id="input-origin"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Destination Address
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Seattle, WA"
                            value={newDestination}
                            onChange={(e) => setNewDestination(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 pl-3 pr-3 py-2 rounded-lg outline-none transition-all text-sm"
                            required
                            id="input-destination"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Carrier & Service
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Priority Air"
                            value={newCarrier}
                            onChange={(e) => setNewCarrier(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 pl-3 pr-3 py-2 rounded-lg outline-none transition-all text-sm"
                            required
                            id="input-carrier"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Initial Status
                          </label>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as Shipment["status"])}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 pl-3 pr-3 py-2 rounded-lg outline-none transition-all text-sm font-semibold"
                            id="select-status"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={createLoading}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
                          id="btn-create-submit"
                        >
                          {createLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <>
                              <Plus size={16} />
                              <span>Submit Creation</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: Shipments Catalog */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      {/* Search Bar & Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="font-display font-bold text-lg text-slate-900">
                            Logged Shipments
                          </h3>
                          <p className="text-xs text-slate-400">Total list sorted by latest modifications</p>
                        </div>

                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Filter by Tracking, Destination..."
                            value={adminSearchQuery}
                            onChange={(e) => setAdminSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400 pl-9 pr-3 py-1.5 rounded-lg text-xs outline-none transition-all"
                          />
                        </div>
                      </div>

                      {/* Shipment List Table */}
                      {dashboardLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          <span className="text-xs text-slate-400">Querying central records...</span>
                        </div>
                      ) : filteredShipments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center space-y-2">
                          <Package className="w-8 h-8 opacity-40" />
                          <p className="text-sm font-semibold">No Shipments Found</p>
                          <p className="text-xs">No entries match your filtering parameters.</p>
                        </div>
                      ) : (
                        <div>
                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                  <th className="pb-3 font-semibold">Tracking ID</th>
                                  <th className="pb-3 font-semibold">Route (Origin ➔ Dest)</th>
                                  <th className="pb-3 font-semibold">Carrier</th>
                                  <th className="pb-3 font-semibold">Milestone Status</th>
                                  <th className="pb-3 font-semibold">Last Modified</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {filteredShipments.map((s) => (
                                  <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3.5 pr-2 font-mono font-bold text-slate-900">
                                      <div className="flex items-center gap-1.5">
                                        <span>{s.trackingId}</span>
                                        <button
                                          onClick={() => copyToClipboard(s.trackingId)}
                                          className="text-slate-400 hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
                                          title="Copy Tracking ID"
                                        >
                                          {copiedId === s.trackingId ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                          ) : (
                                            <Clipboard className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-3.5 pr-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-800">{s.origin}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="font-semibold text-slate-800">{s.destination}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 pr-2 text-slate-500 font-medium">
                                      {s.carrierService}
                                    </td>
                                    <td className="py-3.5 pr-2">
                                      <select
                                        value={s.status}
                                        onChange={(e) => handleStatusUpdate(s.trackingId, e.target.value as Shipment["status"])}
                                        className={`font-semibold rounded-md border text-[11px] px-2 py-1 outline-none transition-colors select-status-item ${getStatusBadge(s.status)}`}
                                      >
                                        <option value="Pending">Pending</option>
                                        <option value="In Transit">In Transit</option>
                                        <option value="Out for Delivery">Out for Delivery</option>
                                        <option value="Delivered">Delivered</option>
                                      </select>
                                    </td>
                                    <td className="py-3.5 text-slate-400 font-medium">
                                      {formatDate(s.updatedAt)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card-Based View */}
                          <div className="block md:hidden space-y-4">
                            {filteredShipments.map((s) => (
                              <div key={s.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-sm">
                                    <span>{s.trackingId}</span>
                                    <button
                                      onClick={() => copyToClipboard(s.trackingId)}
                                      className="text-slate-400 hover:text-slate-700 p-1"
                                    >
                                      {copiedId === s.trackingId ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <Clipboard className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {formatDate(s.updatedAt)}
                                  </span>
                                </div>

                                <div className="space-y-1.5 border-t border-b border-slate-200/60 py-2.5">
                                  <div className="flex items-start gap-1.5 text-xs text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                    <span>
                                      <strong className="text-slate-800">Origin: </strong>
                                      {s.origin}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-1.5 text-xs text-slate-600">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>
                                      <strong className="text-slate-800">Destination: </strong>
                                      {s.destination}
                                    </span>
                                  </div>
                                  <div className="flex items-start gap-1.5 text-xs text-slate-600">
                                    <Package className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                                    <span>
                                      <strong className="text-slate-800">Carrier: </strong>
                                      {s.carrierService}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Milestone:
                                  </span>
                                  <select
                                    value={s.status}
                                    onChange={(e) => handleStatusUpdate(s.trackingId, e.target.value as Shipment["status"])}
                                    className={`font-semibold rounded-lg border text-xs px-3 py-1.5 outline-none transition-colors select-status-item ${getStatusBadge(s.status)}`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="In Transit">In Transit</option>
                                    <option value="Out for Delivery">Out for Delivery</option>
                                    <option value="Delivered">Delivered</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </main>

      {/* Expanded Multi-Column Footer */}
      <footer className="mt-auto bg-slate-900 border-t border-slate-950 text-slate-400 py-16 text-xs font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-8">
          {/* Column 1: Brand Info & Socials */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20">
                PM
              </div>
              <span className="font-display font-extrabold text-base tracking-tight">Paramount Maritime</span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-xs font-medium">
              Bridging continents with unparalleled global freight, secure customs forwarding, and real-time transit telemetry.
            </p>
            <div className="flex items-center gap-3 pt-2 text-slate-500">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Twitter size={16} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Linkedin size={16} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                <Github size={16} />
              </a>
            </div>
          </div>

          {/* Column 2: Anchor scroll-links */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-white text-xs uppercase tracking-wider font-semibold">Quick Navigation</h4>
            <ul className="space-y-2.5 font-medium text-slate-500">
              <li>
                <button onClick={() => scrollToSection("services")} className="hover:text-slate-300 transition-colors cursor-pointer text-left">
                  Services & Scope
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("about")} className="hover:text-slate-300 transition-colors cursor-pointer text-left">
                  Our Legacy
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("resources")} className="hover:text-slate-300 transition-colors cursor-pointer text-left">
                  Compliance Resources
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection("contact")} className="hover:text-slate-300 transition-colors cursor-pointer text-left">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Terminal Control Toggles */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-white text-xs uppercase tracking-wider font-semibold">Terminal Toggles</h4>
            <ul className="space-y-2.5 font-medium text-slate-500">
              <li>
                <button onClick={() => navigate("/")} className="hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5">
                  <Globe size={12} />
                  <span>Tracking Terminal</span>
                </button>
              </li>
              <li>
                <button onClick={() => navigate("/admin/login")} className="hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5">
                  <Shield size={12} />
                  <span>Console Authentication</span>
                </button>
              </li>
              {isAuthenticated && (
                <li>
                  <button onClick={() => navigate("/admin/dashboard")} className="hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5">
                    <Lock size={12} />
                    <span>Operations Dashboard</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Contact details */}
          <div className="space-y-4">
            <h4 className="font-display font-extrabold text-white text-xs uppercase tracking-wider font-semibold">Operational Center</h4>
            <ul className="space-y-2.5 text-slate-500 font-medium font-sans">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <span>100 Maritime Plaza, London, EC3V 3ND</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400 shrink-0" />
                <span>ops@paramountmaritime.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400 shrink-0" />
                <span>+44 (0) 20 7946 0192</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal & Compliance Bottom Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800/60 text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4 font-medium font-sans">
          <p>© {new Date().getFullYear()} Paramount Maritime Global Operations. All rights reserved.</p>
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>TLS v1.3 Secure Link</span>
            </span>
            <span>•</span>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
