import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useAuthUser, useLogout } from "@/hooks/useAuth";
import { motion, AnimatePresence, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Globe, Code2, LayoutDashboard, ShoppingCart, Cpu, Link2, 
  Star, MessageSquare, Mail, Phone, Building, 
  Sparkles, Send, ShieldCheck, Heart, ArrowRight, CheckCircle2, 
  Sun, Moon, ShieldAlert, Award, Target, HelpCircle, ChevronRight,
  Settings, LogOut, Users, Briefcase, CreditCard, Menu, X
} from "lucide-react";
import logo from "@/assets/logo.jpg";
import paymentsMockup from "@/assets/payments_mockup.png";
import { Badge } from "@/components/ui/badge";

interface PublicFeedback {
  _id: string;
  clientName: string;
  clientCompany: string;
  rating: number;
  comments: string;
  projectName: string;
  createdAt: string;
}

interface HomeCard {
  _id: string;
  type: 'service' | 'testimonial';
  title: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  icon?: string;
  author?: string;
  company?: string;
  rating?: number;
}

interface PublicProject {
  id: string;
  name: string;
  description: string;
  clientCompany: string;
  status: string;
  progress: number;
  color?: string;
  liveUrl?: string;
}

// Fallback services
const DEFAULT_SERVICES = [
  {
    title: "Web Development",
    subtitle: "🌐 Web Development",
    bullets: ["Responsive Websites", "Business Websites", "Landing Pages", "Portfolio Websites"],
    icon: "Globe"
  },
  {
    title: "MERN Stack Development",
    subtitle: "⚛️ MERN Stack",
    bullets: ["React.js Applications", "Node.js & Express.js APIs", "MongoDB Integration", "Full-Stack Web Applications"],
    icon: "Code2"
  },
  {
    title: "Admin Dashboard Development",
    subtitle: "📊 Dashboard Panels",
    bullets: ["User Management Systems", "Analytics Dashboards", "CRM & ERP Panels", "Inventory Management"],
    icon: "LayoutDashboard"
  },
  {
    title: "E-Commerce Development",
    subtitle: "🛒 E-Commerce Solutions",
    bullets: ["Online Stores", "Shopping Cart Systems", "Payment Gateway Integration", "Order Management"],
    icon: "ShoppingCart"
  },
  {
    title: "AI Chatbot Development",
    subtitle: "🤖 AI Chatbot Solutions",
    bullets: ["Customer Support Bots", "Website Chatbots", "OpenAI Integration", "WhatsApp Chatbots"],
    icon: "Cpu"
  },
  {
    type: "service",
    title: "API & Backend Development",
    subtitle: "🔗 API & Backend Dev",
    bullets: ["REST APIs", "Authentication (JWT)", "Database Design", "Third-Party API Integration"],
    icon: "Link2"
  }
];

const DEFAULT_TESTIMONIALS = [
  {
    _id: "t1",
    author: "Arjun Sen",
    company: "TechFlow Systems",
    rating: 5,
    content: "The custom dashboard developed by Strategic Brand Solutions has revolutionized our internal operations. Outstanding speed and sleek design.",
    projectName: "TechFlow ERP Portal",
    createdAt: new Date().toISOString()
  },
  {
    _id: "t2",
    author: "Rohit Sharma",
    company: "Blue Creative",
    rating: 5,
    content: "Excellent communication and brilliant design sensibilities. The live website preview cards on the client portal are a massive hit.",
    projectName: "Creative Agency Hub",
    createdAt: new Date().toISOString()
  },
  {
    _id: "t3",
    author: "Sara Jenkins",
    company: "Veloce SaaS",
    rating: 5,
    content: "We got exactly what we needed: a high-converting landing page and an integrated chat system. Exceptional MERN stack consulting.",
    projectName: "Veloce Landing Page",
    createdAt: new Date().toISOString()
  },
  {
    _id: "t4",
    author: "Devendra Patil",
    company: "Apex Healthcare",
    rating: 5,
    content: "Their responsiveness is next level. The dashboard is smooth, secure, and extremely premium. Our clients love it.",
    projectName: "Apex Clinic Dashboard",
    createdAt: new Date().toISOString()
  },
  {
    _id: "t5",
    author: "Emily Watson",
    company: "Lumina Studio",
    rating: 5,
    content: "Beautiful animations, attention to detail, and a highly secure architecture. SBS is our go-to partner for web engineering.",
    projectName: "Lumina Portfolio Store",
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_PROJECTS = [
  {
    id: "p1",
    name: "Strategic Brand Identity Dashboard",
    description: "A premium real-time brand analytics portal for enterprise marketing metrics, featuring custom data visualization, performance reporting, and visual brand guidelines configuration.",
    color: "#7c3aed",
    liveUrl: "http://localhost:3000/",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "p2",
    name: "SaaS Analytics Platform Integration",
    description: "An advanced cloud computing analytics system built on Node.js/MongoDB with secure JWT session authentication, real-time alert logs, and Stripe invoice billing integration.",
    color: "#0284c7",
    liveUrl: "http://localhost:3000/",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80"
  },
  {
    id: "p3",
    name: "E-Commerce Web Portal",
    description: "Custom e-commerce shopping platform built for direct sales, inventory control checks, multiple payment modes, and optimized SEO landing layouts.",
    color: "#10b981",
    liveUrl: "http://localhost:3000/",
    imageUrl: "https://images.unsplash.com/photo-1557821552-17105176677c?auto=format&fit=crop&w=800&q=80"
  }
];

const STRENGTHS = [
  {
    id: "01",
    title: "Strategic Positioning",
    desc: "We align brand architecture with market intent. Every landing page and design layout is audited for maximum authority, credibility, and organic search index visibility.",
    icon: Target
  },
  {
    id: "02",
    title: "Creative Engineering",
    desc: "High-fidelity React rendering, lightweight backend API design, and secured MERN stack portals built to load in fractions of a second with zero performance compromises.",
    icon: Award
  },
  {
    id: "03",
    title: "Interactive Collaboration",
    desc: "Empowering client portal spaces. Review milestones in real-time, initiate group chats with engineers, monitor invoice statuses, and download structured billing PDFs instantly.",
    icon: ShieldCheck
  }
];

// Row 1 (right-to-left): Frontend + Backend tools
const ROW1_TOOLS = [
  { name: "HTML5", color: "#E34F26", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#E34F26"><path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.413z"/></svg> },
  { name: "CSS3", color: "#1572B6", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1572B6"><path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.413z"/><path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438z" fill="#264DE4" opacity="0.7"/></svg> },
  { name: "JavaScript", color: "#F7DF1E", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#F7DF1E"><path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.704-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/></svg> },
  { name: "TypeScript", color: "#3178C6", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#3178C6"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg> },
  { name: "React.js", color: "#61DAFB", icon: () => <svg className="w-4 h-4 animate-spin" style={{ animationDuration: '12s' }} viewBox="0 0 24 24" fill="none" stroke="#61DAFB" strokeWidth="1.2"><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(90 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(150 12 12)"/><circle cx="12" cy="12" r="2" fill="#61DAFB" stroke="none"/></svg> },
  { name: "Next.js", color: "#ffffff", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.573 0z"/></svg> },
  { name: "Tailwind CSS", color: "#06B6D4", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#06B6D4"><path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"/></svg> },
  { name: "Bootstrap 5", color: "#7952B3", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#7952B3"><path d="M6.375 7.125V16.5h5.25a2.812 2.812 0 0 0 1.816-.658 2.25 2.25 0 0 0 .746-1.783q.001-.887-.492-1.435a2.25 2.25 0 0 0-1.303-.68v-.094a2.25 2.25 0 0 0 1.066-.773 2.02 2.02 0 0 0 .398-1.253 2.09 2.09 0 0 0-.703-1.664q-.739-.656-2.109-.656zm1.781 1.406h3.094q.82 0 1.219.375.398.375.398.984 0 .64-.398 1.007-.398.35-1.219.35H8.156zm0 4.078h3.422q.945 0 1.43.422.492.422.492 1.148 0 .71-.485 1.148-.48.422-1.437.422H8.156zM0 6.75v10.5A4.5 4.5 0 0 0 4.5 21.75h15a4.5 4.5 0 0 0 4.5-4.5V6.75A4.5 4.5 0 0 0 19.5 2.25h-15A4.5 4.5 0 0 0 0 6.75z"/></svg> },
  { name: "jQuery", color: "#0769AD", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0769AD"><path d="M11.847.5C5.488.5.5 5.488.5 11.847s4.988 11.347 11.347 11.347 11.347-4.988 11.347-11.347S18.206.5 11.847.5zm0 1.5c5.432 0 9.847 4.415 9.847 9.847s-4.415 9.847-9.847 9.847S2 17.279 2 11.847 6.415 2 11.847 2z"/><path d="M7.614 9.13c1.01 1.01 1.463 2.248 1.463 3.469a4.74 4.74 0 0 1-1.38 3.356 4.74 4.74 0 0 1-3.357 1.38A4.742 4.742 0 0 1 .983 15.957l1.062-1.062c.566.566 1.325.906 2.295.906s1.729-.34 2.295-.906.906-1.325.906-2.295-.34-1.729-.906-2.295L5.573 9.243l-.057-.057 1.062-1.062zM12.53 9.13c1.01 1.01 1.463 2.248 1.463 3.469a4.74 4.74 0 0 1-1.38 3.356 4.74 4.74 0 0 1-3.357 1.38 4.742 4.742 0 0 1-3.357-1.38l1.062-1.062c.566.566 1.325.906 2.295.906s1.729-.34 2.295-.906.906-1.325.906-2.295-.34-1.729-.906-2.295l-1.062-1.062 1.062-1.062z"/></svg> },
  { name: "GSAP", color: "#88CE02", icon: () => <span style={{ color: '#88CE02' }} className="font-extrabold text-xs font-mono tracking-tighter">GSAP</span> },
  { name: "Framer Motion", color: "#BB4BFF", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#BB4BFF"><path d="M4 0h16v8H4zm0 8h8l8 8H4zm0 8h8v8z"/></svg> },
  { name: "Node.js", color: "#339933", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#339933"><path d="M11.998 24c-.321 0-.641-.084-.922-.247l-2.936-1.737c-.438-.245-.224-.332-.08-.383.585-.203.703-.25 1.328-.604.065-.037.151-.023.218.017l2.256 1.338c.082.045.198.045.272 0l8.795-5.076c.082-.047.134-.141.134-.238V6.921c0-.099-.053-.19-.137-.24l-8.791-5.072a.278.278 0 0 0-.271 0L3.075 6.68c-.084.047-.139.142-.139.241v10.15c0 .097.055.189.137.236l2.409 1.391c1.307.654 2.108-.116 2.108-.891V7.787c0-.142.114-.253.256-.253h1.115c.139 0 .255.111.255.253v10.021c0 1.745-.95 2.745-2.604 2.745-.508 0-.909 0-2.026-.551L2.28 18.675c-.57-.329-.922-.939-.922-1.591V6.921c0-.658.352-1.265.922-1.594l8.795-5.082c.557-.315 1.296-.315 1.85 0l8.795 5.082c.57.329.924.938.924 1.594v10.163c0 .654-.354 1.261-.924 1.594l-8.795 5.082a1.873 1.873 0 0 1-.927.24z"/></svg> },
  { name: "Express.js", color: "#aaaaaa", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#aaaaaa"><path d="M24 18.588a1.529 1.529 0 0 1-1.895-.72l-3.45-4.771-.5-.667-4.003 5.444a1.466 1.466 0 0 1-1.802.708l5.158-6.92-4.798-6.251a1.595 1.595 0 0 1 1.9.666l3.576 4.83 3.596-4.81a1.435 1.435 0 0 1 1.788-.668L21.708 7.9l-2.522 3.283a.666.666 0 0 0 0 .994l4.804 6.412zM.002 11.576l.42-2.075c1.154-4.103 5.858-5.81 9.094-3.27 1.895 1.489 2.368 3.597 2.275 5.973H1.116C.943 16.447 4.005 19.009 7.92 17.7a4.078 4.078 0 0 0 2.582-2.876c.207-.666.548-.78 1.174-.588a5.417 5.417 0 0 1-2.589 3.957 6.272 6.272 0 0 1-7.306-.933 6.575 6.575 0 0 1-1.64-3.858c0-.235-.08-.455-.134-.666A88.33 88.33 0 0 1 0 11.577zm1.127-.286h9.654c-.06-3.076-2.001-5.258-4.59-5.278-2.882-.04-4.944 2.094-5.071 5.264z"/></svg> },
  { name: "MongoDB", color: "#47A248", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#47A248"><path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0 1 11.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 0 0 3.639-8.464c.01-.814-.154-1.86-.197-2.218z"/></svg> },
];

// Row 2 (left-to-right): Database + Auth + DevOps + Design + AI + Cloud
const ROW2_TOOLS = [
  { name: "MySQL", color: "#4479A1", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#4479A1"><path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.133-.04-.04-.147-.513-.182-.513v.015zm-1.585-1.76c-.086 0-.14.05-.193.13v.013c.047.027.086.066.127.1.053.08.1.154.146.232.028-.014.054-.014.066-.035.054-.094.087-.193.074-.3-.053-.08-.107-.14-.22-.14zm5.168 1.71c-.063 0-.088.035-.115.08v.012c.027.028.053.055.074.087.04.066.074.132.1.2.04-.012.053-.04.053-.072.013-.088.013-.166-.014-.233-.026-.088-.086-.074-.098-.074zm-8.77-2.94c.034 0 .06-.014.088-.04l.006.006c-.006.02-.007.04-.007.062a.08.08 0 0 0 .008.048c.015.034.042.06.076.06.055 0 .09-.042.09-.096 0-.048-.02-.082-.054-.1-.02-.012-.042-.012-.062-.012l-.007-.006a.08.08 0 0 0-.003-.037L12 2.5v.011zm2.17 0c-.046 0-.088.015-.12.046l.006.006c0 .02.005.04.013.055.02.04.06.067.1.067.056 0 .094-.046.094-.1 0-.06-.04-.1-.094-.1v.012zm-4.42.44c-.114 0-.193.06-.193.167v.013c.042.027.087.047.134.06.066.02.134.034.2.034.02-.013.04-.034.053-.053.027-.066.04-.14.027-.214-.04-.007-.073-.007-.1-.007zm1.16-.7c-.08 0-.14.048-.16.12v.014c.04.013.08.027.12.047.08.033.16.073.227.126.027-.02.04-.053.027-.087-.02-.1-.073-.18-.147-.22-.027-.013-.042-.02-.067-.02zm.75-.27c-.067 0-.12.027-.16.08v.014c.04.02.08.04.113.067.067.04.127.087.186.14.02-.02.033-.053.027-.087-.02-.1-.073-.167-.14-.2a.17.17 0 0 0-.026-.014zm4.42.18c-.034 0-.06.013-.08.034l.007.007v.02c.02.047.06.08.107.08.06 0 .1-.047.1-.1 0-.06-.046-.1-.1-.1l-.034.059zm-5.57 1.38c-.053 0-.1.014-.133.04v.014c.02.013.04.027.06.047.066.04.133.08.2.12.013-.027.02-.06.013-.1-.02-.06-.066-.1-.14-.12zm-1.967-.74c-.04 0-.073.014-.1.04v.012c.027.02.053.04.08.067.06.04.12.08.18.12.013-.027.02-.053.02-.087-.013-.067-.053-.12-.12-.14a.15.15 0 0 0-.06-.012zm8.85.22c-.04 0-.074.014-.1.04v.014c.027.02.054.04.08.06.06.04.12.086.18.126.014-.027.02-.06.02-.1-.013-.073-.053-.127-.12-.14a.15.15 0 0 0-.06-.013v.013zm-7.74 1.153c-.034 0-.06.014-.08.034l.007.006.007.02c.027.054.073.087.12.087.06 0 .1-.046.1-.1 0-.06-.046-.1-.1-.1l-.054.053zm11.83-.21c-.034 0-.06.013-.08.04l.007.007.007.02c.02.046.066.08.113.08.06 0 .1-.047.1-.1 0-.06-.047-.1-.1-.1l-.047.053zM12.007 2.06a9.893 9.893 0 0 0-5.06 1.387l.007.007A10.046 10.046 0 0 0 2.06 12c0 5.516 4.47 9.987 9.987 9.987S22.033 17.517 22.033 12c0-5.52-4.47-9.94-10.026-9.94zm2.667 2.52c.007 0 .014 0 .02.007.047.02.08.053.094.1.013.04.006.073-.007.1a.147.147 0 0 1-.127.073c-.053 0-.1-.027-.126-.073l-.007-.02c.027-.04.06-.08.094-.107.02-.013.04-.02.06-.02v-.06z"/></svg> },
  { name: "PostgreSQL", color: "#336791", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#336791"><path d="M23.5 11.357c-.07-.325-.256-.6-.515-.773l-6.654-4.41a.903.903 0 0 0-.952-.018l-1.946 1.172C13.21 6.112 12.7 5.5 12 5.5s-1.21.612-1.433 1.828L8.62 6.156a.9.9 0 0 0-.95.018L1.016 10.584A1.13 1.13 0 0 0 .5 11.357v3.573c0 .444.26.838.667 1.013l3.166 1.355c.23.1.487.097.714-.006l5.093-2.382.694.398v3.192A1.5 1.5 0 0 0 12 20a1.5 1.5 0 0 0 1.166-2.5v-3.192l.694-.398 5.093 2.382c.227.103.483.106.714.006l3.166-1.355A1.12 1.12 0 0 0 23.5 14.93v-3.573zM12 8c.552 0 1 .897 1 2s-.448 2-1 2-1-.897-1-2 .448-2 1-2z"/></svg> },
  { name: "Redis", color: "#DC382D", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#DC382D"><path d="M10.5 8.5l-4 2.25L3 8.5l4-2.25 3.5 2.25zM20.5 8.5l-4 2.25-3.5-2.25 4-2.25 3.5 2.25zM12 2l-4 2.25L4 2l4-2.25L12 2z"/></svg> },
  { name: "Firebase", color: "#FFCA28", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FFCA28"><path d="M3.89 15.672L6.255.461A.542.542 0 0 1 7.27.288l2.543 4.771zm16.794 3.692l-2.25-14a.54.54 0 0 0-.919-.295L3.316 19.365l7.856 4.427a1.621 1.621 0 0 0 1.588 0zM14.3 7.147l-1.82-3.482a.542.542 0 0 0-.96 0L3.53 17.984z"/></svg> },
  { name: "JWT", color: "#D63AFF", icon: () => <span style={{ color: '#D63AFF' }} className="font-extrabold text-[10px] font-mono tracking-widest">JWT</span> },
  { name: "Git", color: "#F05032", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#F05032"><path d="M23.546 10.93L13.067.452a1.55 1.55 0 0 0-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 0 1 2.327 2.341l2.658 2.66a1.838 1.838 0 0 1 1.9 3.039 1.837 1.837 0 0 1-2.6 0 1.846 1.846 0 0 1-.404-2.009L12.86 8.955v6.525c.176.086.342.203.488.348a1.848 1.848 0 0 1 0 2.6 1.846 1.846 0 0 1-2.609 0 1.848 1.848 0 0 1 0-2.6c.182-.18.387-.316.605-.406V8.835a1.834 1.834 0 0 1-.996-2.41L7.636 3.7.45 10.881a1.55 1.55 0 0 0 0 2.189l10.48 10.477a1.549 1.549 0 0 0 2.187 0l10.428-10.43a1.548 1.548 0 0 0 0-2.187z"/></svg> },
  { name: "GitHub", color: "#aaaaaa", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z"/></svg> },
  { name: "Docker", color: "#2496ED", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#2496ED"><path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.185.185 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.186.186 0 0 0-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 0 0-.75.748 11.376 11.376 0 0 0 .692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 0 0 3.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z"/></svg> },
  { name: "Vercel", color: "#aaaaaa", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg> },
  { name: "AWS", color: "#FF9900", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF9900"><path d="M.6 12.742c-.006.225.075.443.229.612l3.5 3.787c.19.205.466.3.74.251l7.46-1.402a.726.726 0 0 0 .605-.713V4.523a.726.726 0 0 0-.818-.718L.848 5.228A.726.726 0 0 0 .225 5.94L.6 12.742zm22.8 0c.006.225-.075.443-.229.612l-3.5 3.787a.726.726 0 0 1-.74.251l-7.46-1.402a.726.726 0 0 1-.605-.713V4.523a.726.726 0 0 1 .818-.718l11.567 1.423a.726.726 0 0 1 .623.712L23.4 12.742z"/></svg> },
  { name: "Figma", color: "#F24E1E", icon: () => <svg className="w-3.5 h-5" viewBox="0 0 12 18"><path fill="#F24E1E" d="M3 9a3 3 0 1 1 0-6h3v6H3z"/><path fill="#A259FF" d="M3 15a3 3 0 0 1 0-6h3v6H3z"/><path fill="#1ABCFE" d="M6 9a3 3 0 1 0 3-3H6v3z"/><path fill="#0ACF83" d="M6 15a3 3 0 1 1-3-3h3v3z"/><path fill="#FF7262" d="M6 3a3 3 0 0 1 3 3H6V3z"/></svg> },
  { name: "Postman", color: "#FF6C37", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF6C37"><path d="M13.527.099C6.955-.744.942 3.9.099 10.473c-.843 6.572 3.8 12.584 10.373 13.428 6.573.843 12.587-3.801 13.428-10.374C24.744 6.955 20.101.943 13.527.099zm2.471 7.485a.855.855 0 0 0-.593.25l-4.453 4.453-.307-.307-.643-.643 4.453-4.453a.858.858 0 1 0-1.208-1.21L9.094 9.927l-.695-.695a.17.17 0 0 0-.286.119v5.863l5.863.001a.17.17 0 0 0 .12-.289l-.697-.697 4.453-4.453a.858.858 0 0 0-.854-1.192z"/></svg> },
  { name: "Redux", color: "#764ABC", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#764ABC"><path d="M16.634 16.504c.87-.075 1.543-.84 1.5-1.754-.047-.914-.796-1.648-1.709-1.648h-.061a1.71 1.71 0 0 0-1.648 1.769c.03.479.226.869.494 1.153-1.048 2.038-2.621 3.536-5.005 4.795-1.603.838-3.296 1.154-4.944.93-1.378-.195-2.456-.81-3.116-1.799-.988-1.499-1.078-3.116-.255-4.734.6-1.17 1.499-2.023 2.099-2.443a9.96 9.96 0 0 1-.39-1.304c-4.524 3.171-4.061 7.426-2.698 9.463 1.017 1.498 3.057 2.444 5.304 2.444.6 0 1.23-.075 1.843-.224 3.916-.756 6.886-3.086 8.591-6.648zm3.997-2.852c-2.314-2.727-5.738-4.226-9.634-4.226h-.494c-.255-.554-.837-.899-1.498-.899h-.045c-.943 0-1.678.81-1.647 1.753.03.898.794 1.648 1.709 1.648h.06.689 0 1.29-.44 1.54-1.049h.54c2.278 0 4.436.647 6.4 1.918 1.5.96 2.58 2.233 3.196 3.772.54 1.287.51 2.54-.046 3.599-.855 1.648-2.294 2.549-4.196 2.549-1.23 0-2.399-.375-3.024-.72-.33.27-.93.704-1.348.96 1.319.6 2.669.93 3.979.93 2.938 0 5.126-1.648 5.97-3.237.915-1.798.87-4.914-1.472-7.998zM7.044 16.477c.03.899.795 1.648 1.71 1.648h.06c.944 0 1.678-.81 1.647-1.753-.03-.899-.795-1.648-1.709-1.648h-.06c-.06 0-.15 0-.21.03-1.23-2.038-1.74-4.227-1.559-6.579.12-1.799.72-3.357 1.769-4.616 1.289-1.589 3.327-2.354 4.406-2.444h.915c.255-.554.84-.899 1.5-.899h.044c.944 0 1.678.81 1.648 1.753-.03.899-.795 1.648-1.71 1.648h-.06c-.66 0-1.29-.44-1.54-1.049h-.93c-.09 0-2.233.091-3.982 2.1-.989 1.169-1.558 2.672-1.708 4.48-.151 1.978.33 3.96 1.369 5.764a1.85 1.85 0 0 0-.4 1.565z"/></svg> },
  { name: "Socket.IO", color: "#010101", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9 1.036c-5.9 0-10.77 4.737-10.77 10.6 0 5.86 4.87 10.6 10.77 10.6 5.9 0 10.77-4.74 10.77-10.6 0-5.863-4.87-10.6-10.77-10.6zm.2 19.074c-4.6 0-8.33-3.74-8.33-8.357 0-1.3.3-2.527.826-3.614L12.3 16.34c.2.2.5.2.667 0l.826-.84 3.56 3.6a8.27 8.27 0 0 1-5.25 1.01zm4.9-2.46l-3.56-3.6a.47.47 0 0 0-.667 0l-.826.84-7.54-7.616a8.27 8.27 0 0 1 12.593 10.376z"/></svg> },
  { name: "Netlify", color: "#00C7B7", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00C7B7"><path d="M16.934 8.519a1.044 1.044 0 0 1 .303.23l2.349-1.045-2.192-2.171zM12.67 7.769l4.133 4.093h2.327l-4.133-4.093zM20.93 15.023l-3.18-3.164H15.03v.004h-3.773l-3.18-3.164.592.587 2.59-2.575h1.176v1.973l-2.59 2.575.592.588 3.002-2.985h.003l.006-.006.006.006h.003l3.002 2.985.592-.588-2.59-2.575z"/></svg> },
  { name: "Render", color: "#46E3B7", icon: () => <span style={{ color: '#46E3B7' }} className="font-extrabold text-[10px] font-mono tracking-widest">Render</span> },
  { name: "ChatGPT", color: "#74AA9C", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#74AA9C"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg> },
  { name: "Gemini", color: "#8E75B2", icon: () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#8E75B2"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm0-18c-4.41 0-8 3.59-8 8s3.59 8 8 8 8-3.59 8-8-3.59-8-8-8zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg> },
];

// Merged list (for backward compatibility with TickerRow)
const COMBINED_TICKER_LOGOS = [...ROW1_TOOLS, ...ROW2_TOOLS];


const ICON_MAP: Record<string, React.ElementType> = {
  Globe: Globe,
  Code2: Code2,
  LayoutDashboard: LayoutDashboard,
  ShoppingCart: ShoppingCart,
  Cpu: Cpu,
  Link2: Link2
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  review: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  planning: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 14
    }
  }
};

function TickerRow({ items, direction = "left" }: { items: { name: string; icon: () => React.ReactNode }[], direction?: "left" | "right" }) {
  // Repeated 10 times to prevent running out of items and avoid jumps
  const duplicated = [
    ...items, ...items, ...items, ...items, ...items,
    ...items, ...items, ...items, ...items, ...items
  ];
  return (
    <div className="relative w-full overflow-hidden py-6 select-none bg-card/10">
      {/* Premium left & right fading masks */}
      <div className="absolute inset-y-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-background to-transparent z-25 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-background to-transparent z-25 pointer-events-none" />
      
      <div className={`${direction === "left" ? "animate-marquee-rtl" : "animate-marquee-ltr"} flex gap-6 sm:gap-8`}>
        {duplicated.map((item, idx) => {
          const LogoIcon = item.icon;
          return (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border border-border/50 shadow-xs backdrop-blur-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all font-mono cursor-pointer relative group overflow-hidden shrink-0"
            >
              {/* Premium Glow effect */}
              <div className="absolute inset-0 bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <span className="shrink-0 flex items-center justify-center">
                <LogoIcon />
              </span>
              <span className="relative z-10 tracking-wide">{item.name}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface ContainerScrollProps {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
}

export const ContainerScroll = ({
  titleComponent,
  children,
}: ContainerScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[38rem] sm:h-[52rem] md:h-[62rem] lg:h-[68rem] xl:h-[72rem] flex items-center justify-center relative p-2 md:p-10"
      ref={containerRef}
    >
      <div
        className="py-6 md:py-24 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <HeaderScroll translate={translate} titleComponent={titleComponent} />
        <CardScroll rotate={rotate} translate={translate} scale={scale}>
          {children}
        </CardScroll>
      </div>
    </div>
  );
};

export const HeaderScroll = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="div max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const CardScroll = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl lg:max-w-6xl xl:max-w-[1100px] mt-6 sm:mt-12 md:mt-20 mx-auto h-[18rem] sm:h-[26rem] md:h-[34rem] lg:h-[38rem] xl:h-[42rem] w-full border-2 md:border-4 border-[#6C6C6C] p-1.5 md:p-6 bg-[#222222] rounded-[20px] md:rounded-[30px] shadow-2xl"
    >
      <div className=" h-full w-full  overflow-hidden rounded-2xl bg-gray-100 dark:bg-zinc-900 md:rounded-2xl md:p-4 ">
        {children}
      </div>
    </motion.div>
  );
};

export default function Home() {
  const { toast } = useToast();
  const { data: user } = useAuthUser();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setProfileDropdownOpen(false);
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        window.location.href = "/";
      }
    });
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  const [contactOpen, setContactOpen] = useState(false);
  const [heroTab, setHeroTab] = useState<"strategy" | "engineering">("strategy");
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    projectType: "",
    otherProjectType: "",
    description: "",
    message: ""
  });

  // Sync isDark with root HTML element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // 1. Fetch dynamically editable home page cards (Services & Testimonials)
  const { data: cardsData } = useQuery<{ services: HomeCard[], testimonials: HomeCard[] }>({
    queryKey: ["home-page-cards"],
    queryFn: () => apiFetch<{ services: HomeCard[], testimonials: HomeCard[] }>("/home-cards"),
    staleTime: 60000
  });

  const servicesList = cardsData?.services && cardsData.services.length > 0 ? cardsData.services : DEFAULT_SERVICES;
  const testimonialsList = cardsData?.testimonials && cardsData.testimonials.length > 0 ? cardsData.testimonials : null;

  // 2. Fetch public feedbacks completed reviews as a backup
  const { data: feedbacksData } = useQuery<{ data: PublicFeedback[] }>({
    queryKey: ["public-feedback-carousel"],
    queryFn: () => apiFetch<{ data: PublicFeedback[] }>("/feedback/public"),
    staleTime: 60000
  });

  const backupsFeedbacks = feedbacksData?.data ?? [];
  const activeFeedbacks = (testimonialsList && testimonialsList.length > 0)
    ? testimonialsList
    : (backupsFeedbacks && backupsFeedbacks.length > 0)
      ? backupsFeedbacks
      : DEFAULT_TESTIMONIALS;

  // 3. Fetch public projects showcase list
  const { data: projectsData } = useQuery<{ data: PublicProject[] }>({
    queryKey: ["public-projects-showcase"],
    queryFn: () => apiFetch<{ data: PublicProject[] }>("/projects/public"),
    staleTime: 10000,
    refetchInterval: 30000
  });

  const showcaseProjects = projectsData?.data && projectsData.data.length > 0
    ? projectsData.data
    : DEFAULT_PROJECTS;

  // Contact Message Mutation
  const contactMutation = useMutation({
    mutationFn: (body: typeof contactForm) => 
      apiFetch("/contact", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({
        title: "Inquiry Sent! ✉️",
        description: "Thank you! We'll review your project and get back to you shortly."
      });
      setContactForm({ name: "", phone: "", email: "", projectType: "", otherProjectType: "", description: "", message: "" });
      setTimeout(() => {
        setContactOpen(false);
      }, 1500);
    },
    onError: (err: any) => {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    }
  });

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast({ title: "Missing fields", description: "Please fill out required fields", variant: "destructive" });
      return;
    }
    contactMutation.mutate(contactForm);
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Dynamic Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-[100]" 
        style={{ scaleX }} 
      />
      
      {/* Bidirectional Marquee Tickers Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee-rtl {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-ltr {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        @keyframes marquee-testimonials {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.3333%); }
        }
        .animate-marquee-rtl {
          display: flex;
          width: max-content;
          animation: marquee-rtl 90s linear infinite;
          will-change: transform;
        }
        .animate-marquee-ltr {
          display: flex;
          width: max-content;
          animation: marquee-ltr 90s linear infinite;
          will-change: transform;
        }
        .animate-marquee-testimonials {
          display: flex;
          width: max-content;
          gap: 1.5rem;
          animation: marquee-testimonials 60s linear infinite;
          will-change: transform;
        }
        .animate-marquee-rtl:hover, .animate-marquee-ltr:hover, .animate-marquee-testimonials:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => scrollTo("hero")}>
            <img src={logo} alt="SBS Logo" className="w-10 h-10 rounded-full border-2 border-primary object-cover shadow-sm" />
            <div className="hidden sm:block">
              <span className="font-serif font-black text-foreground text-sm tracking-wide block leading-none">Strategic Brand Solutions</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Creative Brand Consulting</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => scrollTo("strengths")} className="hover:text-primary transition-colors cursor-pointer">Strengths</button>
            <button onClick={() => scrollTo("services")} className="hover:text-primary transition-colors cursor-pointer">Services</button>
            <button onClick={() => scrollTo("projects")} className="hover:text-primary transition-colors cursor-pointer">Projects</button>
            <button onClick={() => scrollTo("feedbacks")} className="hover:text-primary transition-colors cursor-pointer">Reviews</button>
            <Link href="/showcase" className="hover:text-primary transition-colors cursor-pointer">Showcase</Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 relative">
            {/* Hamburger Icon for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-muted text-foreground cursor-pointer flex items-center justify-center"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Theme Toggle Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsDark(prev => !prev)} 
              className="rounded-full w-9 h-9 border border-border/30 hover:bg-muted shrink-0 text-foreground"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-600" />}
            </Button>

            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-background focus:outline-none hover:scale-105 active:scale-95 transition-transform"
                >
                  {getInitial(user.name)}
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setProfileDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border/85 shadow-2xl p-1.5 z-50 backdrop-blur-md bg-opacity-95"
                      >
                        <div className="px-3 py-2 border-b border-border/40 mb-1">
                          <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                        <Link href={user.role === "admin" ? "/admin" : "/client"}>
                          <button 
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-left"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                          </button>
                        </Link>
                        <Link href={user.role === "admin" ? "/admin/settings" : "/client/profile"}>
                          <button 
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-primary/10 hover:text-primary rounded-lg transition-colors text-left"
                          >
                            <Settings className="w-3.5 h-3.5" /> Settings
                          </button>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors text-left font-semibold"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Logout
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="hidden sm:inline-flex h-9 text-xs sm:text-sm border-primary/20 hover:bg-primary/5 text-primary font-bold">
                  Login
                </Button>
              </Link>
            )}
            <Button onClick={() => setContactOpen(true)} className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-xs sm:text-sm shrink-0">
              Get in Touch
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-background border-l border-border p-6 shadow-2xl flex flex-col justify-between md:hidden"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="Logo" className="w-8 h-8 rounded-full border-2 border-primary object-cover" />
                    <span className="font-serif font-black text-xs text-foreground truncate max-w-[140px]">Strategic Brand</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-muted text-foreground cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-4 text-base font-semibold text-muted-foreground">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); scrollTo("strengths"); }} 
                    className="flex items-center gap-3 py-2 text-left hover:text-primary transition-colors cursor-pointer"
                  >
                    <Target className="w-4 h-4" /> Strengths
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); scrollTo("services"); }} 
                    className="flex items-center gap-3 py-2 text-left hover:text-primary transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Services
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); scrollTo("projects"); }} 
                    className="flex items-center gap-3 py-2 text-left hover:text-primary transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4" /> Projects
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); scrollTo("feedbacks"); }} 
                    className="flex items-center gap-3 py-2 text-left hover:text-primary transition-colors cursor-pointer"
                  >
                    <Star className="w-4 h-4" /> Reviews
                  </button>
                  <Link 
                    href="/showcase" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="flex items-center gap-3 py-2 hover:text-primary transition-colors cursor-pointer"
                  >
                    <Globe className="w-4 h-4" /> Showcase
                  </Link>
                </nav>
              </div>

              <div className="space-y-3 pt-6 border-t border-border">
                {user ? (
                  <Link href={user.role === "admin" ? "/admin" : "/client"} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full justify-start gap-2 h-11 bg-primary text-primary-foreground font-semibold">
                      <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full h-11 border-primary/20 hover:bg-primary/5 text-primary font-bold">
                      Login Portal
                    </Button>
                  </Link>
                )}
                <Button 
                  onClick={() => { setMobileMenuOpen(false); setContactOpen(true); }} 
                  className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black font-semibold"
                >
                  Get in Touch
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 2. Redesigned Visual Hero Section (Visor Glow & Coordinates) */}
      <section id="hero" className="relative overflow-hidden border-b bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent">
        {/* Glow Arch Dome (Visor Effect) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[300px] sm:h-[450px] bg-gradient-to-b from-primary/15 via-primary/3 to-transparent rounded-b-full blur-3xl pointer-events-none -z-10" />
        
        {/* Visor Crescent Arc Line */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[350px] sm:w-[700px] h-[175px] sm:h-[300px] border-t-2 border-primary/30 rounded-full opacity-50 pointer-events-none -z-10 shadow-[0_-20px_50px_-25px_rgba(124,58,237,0.4)]" />
        
        {/* Coordinate crosshair markers */}
        <div className="absolute top-12 left-6 sm:left-20 text-muted-foreground/35 font-mono text-[9px] pointer-events-none select-none tracking-widest">+ 45.1903° N</div>
        <div className="absolute top-12 right-6 sm:right-20 text-muted-foreground/35 font-mono text-[9px] pointer-events-none select-none tracking-widest">+ 09.3326° E</div>
        
        <ContainerScroll
          titleComponent={
            <div className="text-center space-y-6 max-w-4xl mx-auto px-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] sm:text-xs text-primary font-bold tracking-widest uppercase font-mono select-none">
                [ ✦ INTRODUCING ACTIVE CLIENT PORTALS ✦ ]
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-serif font-black tracking-tight leading-none text-foreground">
                Everything you need to <br className="hidden md:inline" />
                build <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-500 to-violet-500">authoritative apps.</span>
              </h1>
              <p className="max-w-3xl mx-auto text-xs sm:text-sm md:text-base text-muted-foreground font-serif leading-relaxed italic border-x border-border/30 px-6 sm:px-10">
                Strategic Brand Solutions is a full-stack MERN agency providing high-fidelity brand consulting and custom client portal systems.
              </p>
              <div className="flex justify-center items-center gap-4 pt-2">
                <Link href="/login">
                  <Button size="lg" className="h-12 px-6 rounded-3xl bg-foreground text-background hover:bg-foreground/90 font-semibold flex items-center justify-center gap-2 group shadow-md cursor-pointer dark:bg-white dark:text-black">
                     Login Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <button onClick={() => scrollTo("services")} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-all py-3 px-5 border border-border/60 hover:bg-muted/40 rounded-3xl font-mono cursor-pointer">
                  Explore Services
                </button>
              </div>
            </div>
          }
        >
          {/* Card Scroll Content (Mockup window) */}
          <div className="w-full h-full flex flex-col relative group">
            {/* Window Header */}
            <div className="h-10 border-b border-border/60 bg-muted/30 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[10px] sm:text-xs font-mono text-muted-foreground">
                {heroTab === "strategy" ? "brand-identity-config.yaml" : "strategic-brand-admin-portal"}
              </span>
              <div className="w-12" />
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto selection:bg-primary/20 bg-background">
              {heroTab === "strategy" ? (
                <div className="w-full h-full relative animate-in fade-in duration-300">
                  <img
                    src=" https://i.postimg.cc/Y24jrCtz/Screenshot-2026-06-05-125903.png"
                    alt="Brand Strategy Visual System"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md border border-border/40 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md font-sans">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-wider">Brand Strategy & Guidelines</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-md border border-border/40 p-3 sm:p-4 rounded-xl flex items-center justify-between shadow-lg font-sans">
                    <div className="min-w-0 pr-2">
                      <p className="text-[9px] font-mono text-primary font-black uppercase tracking-wider">Active Brand Workspace</p>
                      <h4 className="text-xs font-black text-foreground truncate mt-0.5">Corporate Identity & Design Audit Panel</h4>
                    </div>
                    <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-bold shrink-0">
                      Compiling Live
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative animate-in fade-in duration-300 flex items-center justify-center bg-[#0f0f14]">
                  <img
                    src={paymentsMockup}
                    alt="Strategic Brand Admin Payments Portal"
                    className="w-full h-full object-contain object-center"
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-transparent pointer-events-none" />
                </div>
              )}
            </div>
          </div>
        </ContainerScroll>

        {/* Slider Tab Switcher */}
        <div className="w-full max-w-xl mx-auto mt-8 sm:mt-12 mb-16 sm:mb-24 relative z-30">
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-full border border-border/50 shadow-sm relative">
            <button
              type="button"
              onClick={() => setHeroTab("strategy")}
              className={`py-3 px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex flex-col items-center gap-1 cursor-pointer z-10 ${
                heroTab === "strategy"
                  ? "text-primary font-bold bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-bold">Brand Strategy</span>
              <span className="text-[9px] opacity-75 font-normal hidden sm:inline">Visual systems & SEO compliance</span>
            </button>
            <button
              type="button"
              onClick={() => setHeroTab("engineering")}
              className={`py-3 px-4 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 flex flex-col items-center gap-1 cursor-pointer z-10 ${
                heroTab === "engineering"
                  ? "text-primary font-bold bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="font-bold">MERN Engineering</span>
              <span className="text-[9px] opacity-75 font-normal hidden sm:inline">Secure client portal backend</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. Bidirectional Horizontal Scrolling Tools Ticker */}
      <section className="border-b bg-card/25 divide-y divide-border/20">
        <TickerRow items={ROW1_TOOLS} direction="left" />
        <TickerRow items={ROW2_TOOLS} direction="right" />
      </section>

      {/* 4. Strengths Section (Bento Grid Style) */}
      <section id="strengths" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b">
        <motion.div
          className="text-center max-w-2xl mx-auto space-y-3 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="bg-primary/5 text-primary font-mono text-[10px] uppercase tracking-widest py-1 border-primary/20 select-none">
            Our DNA
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-serif font-black text-foreground">Build with the best agency in the universe</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We don't just write code; we design visual systems and strategic solutions engineered to convert.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[220px]">
          {/* Box 1: col-span-4 row-span-2 (Strategic Positioning) */}
          <div className="md:col-span-4 md:row-span-2 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xs p-6 flex flex-col justify-between overflow-hidden relative group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-4 right-5 text-4xl font-black font-mono text-muted-foreground/5 select-none group-hover:text-primary/5 transition-colors">01</div>
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-foreground tracking-tight leading-snug">Strategic Positioning</h3>
              <p className="text-xs text-muted-foreground leading-relaxed pr-2">
                We align your digital presence with commercial intent. Every design system and portal architecture is audited for SEO authority and compliance.
              </p>
            </div>
            <div className="text-[10px] font-mono text-primary/70">✓ Core brand strategy</div>
          </div>

          {/* Box 2: col-span-8 row-span-1 (Pro-Grade MERN Engineering) */}
          <div className="md:col-span-8 md:row-span-1 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xs p-6 flex flex-col justify-between overflow-hidden relative group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <div className="absolute top-4 right-5 text-4xl font-black font-mono text-muted-foreground/5 select-none group-hover:text-primary/5 transition-colors">02</div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 h-full">
              <div className="space-y-2 max-w-md">
                <h3 className="font-serif font-bold text-base text-foreground tracking-tight">Pro-Grade MERN Engineering</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  High-fidelity React rendering, secure backend APIs, and customized client portals designed to execute in milliseconds with zero compromise.
                </p>
              </div>
              <div className="flex gap-4 items-center shrink-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-bold">M</div>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xs font-bold">E</div>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-xs font-bold">R</div>
                <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center text-xs font-bold">N</div>
              </div>
            </div>
          </div>

          {/* Box 3: col-span-4 row-span-1 (100% Production Ready) */}
          <div className="md:col-span-4 md:row-span-1 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xs p-6 flex flex-col justify-between overflow-hidden relative group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-sm text-foreground tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Production-Ready Code
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zero warnings. Clean type-checking. Secured sessions using JSON Web Tokens.
              </p>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground/60">Build check: passed (0 errors)</div>
          </div>

          {/* Box 4: col-span-4 row-span-1 (Realtime Client Portals) */}
          <div className="md:col-span-4 md:row-span-1 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xs p-6 flex flex-col justify-between overflow-hidden relative group hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-sm text-foreground tracking-tight flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" /> Integrated Chat & Invoices
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Empower your clients with secure billing, online payments, and direct instant messaging logs.
              </p>
            </div>
            <div className="text-[10px] font-mono text-primary">Websocket latency: ~12ms</div>
          </div>
        </div>
      </section>

      {/* 5. Redesigned Premium Services Section */}
      <section id="services" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b">
        <motion.div
          className="text-center max-w-2xl mx-auto space-y-3 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="bg-primary/5 text-primary font-mono text-[10px] uppercase tracking-widest py-1 border-primary/20 select-none">
            What We Do
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-serif font-black text-foreground">Services Categories</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            From design visual structures to MERN stack integrations, we deliver professional-grade engineering.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {servicesList.map((item, i) => {
            const LucideIcon = item.icon ? ICON_MAP[item.icon] : Globe;
            const Icon = LucideIcon || Globe;
            return (
              <motion.div key={item._id || i} variants={cardVariants}>
                <Card className="border border-border/50 bg-card/25 backdrop-blur-md transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 relative overflow-hidden group flex flex-col justify-between h-full">
                  {/* Decorative visual hover glow dot */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold opacity-60 block tracking-wider text-muted-foreground uppercase">
                          {item.subtitle || "🌐 Strategic Solutions"}
                        </span>
                        <h3 className="font-serif font-black text-lg text-foreground leading-snug">{item.title}</h3>
                      </div>

                      <ul className="space-y-2 pt-3 border-t border-border/40">
                        {(item.bullets || []).map((b, idx) => (
                          <li key={idx} className="flex items-center gap-2.5 text-xs text-muted-foreground leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/45 shrink-0" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 mt-auto">
                      <Button 
                        variant="ghost" 
                        onClick={() => setContactOpen(true)}
                        className="text-xs p-0 text-primary hover:text-primary/80 hover:bg-transparent flex items-center gap-1 leading-none font-bold"
                      >
                        Inquire details <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* 6. Dynamic Showcase of Active Client Projects */}
      <section id="projects" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b bg-muted/5">
        <motion.div
          className="text-center max-w-2xl mx-auto space-y-3 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="outline" className="bg-primary/5 text-primary font-mono text-[10px] uppercase tracking-widest py-1 border-primary/20 select-none">
            Our Work
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-serif font-black text-foreground">Selected Projects</h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Hand-picked client projects showcasing our best engineering and design work.
          </p>
        </motion.div>

        {showcaseProjects.length === 0 ? (
          <motion.div
            className="text-center p-12 border border-dashed rounded-xl max-w-md mx-auto text-muted-foreground text-sm bg-card/50"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            No projects selected for showcase yet. Admin can select projects in the Home Page Editor.
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {showcaseProjects.slice(0, 3).map((p) => (
              <motion.div key={p.id} variants={cardVariants}>
                {/* Premium Card — image/iframe + title + button only */}
                <div className="group rounded-3xl overflow-hidden bg-card border border-border/50 shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-500 flex flex-col">
                  {/* Iframe Preview */}
                  <div className="relative w-full overflow-hidden rounded-t-3xl bg-muted" style={{ height: '220px' }}>
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={`${p.name} preview`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : p.liveUrl ? (
                      <iframe
                        src={p.liveUrl}
                        className="w-full h-full border-none pointer-events-none"
                        style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133%', height: '133%' }}
                        title={`${p.name} preview`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                        <Globe className="w-12 h-12 text-primary/30" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none rounded-t-3xl" />
                    {/* Color accent bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: p.color || '#7c3aed' }} />
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex flex-col gap-4 flex-1">
                    <h3 className="text-lg font-serif font-black text-foreground leading-snug">{p.name}</h3>
                    
                    {/* Full-width Live Link Button */}
                    {p.liveUrl ? (
                      <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="block w-full mt-auto">
                        <Button
                          className="w-full h-11 rounded-2xl bg-foreground text-background hover:bg-foreground/85 font-bold text-sm transition-all duration-300 group-hover:shadow-md"
                        >
                          <Globe className="w-4 h-4 mr-2" /> View Website
                        </Button>
                      </a>
                    ) : (
                      <Button
                        className="w-full h-11 rounded-2xl bg-foreground/10 text-foreground/40 font-bold text-sm cursor-not-allowed"
                        disabled
                      >
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {showcaseProjects.length > 3 && (
          <div className="flex justify-center mt-12">
            <Link href="/showcase">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-8 rounded-3xl font-bold flex items-center gap-2 group shadow-md transition-all">
                Read More <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* 7. Feedback Reviews Carousel */}
      <section id="feedbacks" className="py-16 md:py-24 bg-muted/15 border-b overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <motion.div
            className="text-center max-w-xl mx-auto space-y-3"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-foreground flex items-center justify-center gap-2">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> Client Success Stories
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Read feedback reviews left by verified companies and clients upon successful project completion.
            </p>
          </motion.div>
        </div>

        {activeFeedbacks.length === 0 ? (
          <div className="text-center p-8 border border-dashed rounded-xl bg-card max-w-md mx-auto text-muted-foreground text-sm">
            No feedback reviews submitted yet. Invite links are sent on project completion!
          </div>
        ) : (
          <div className="relative w-full overflow-hidden py-4">
            {/* Left and Right Fade Gradients */}
            <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <div className="animate-marquee-testimonials">
              {[...activeFeedbacks, ...activeFeedbacks, ...activeFeedbacks].map((f: any, idx) => (
                <Card 
                  key={`${f._id || idx}-${idx}`} 
                  className="w-[300px] sm:w-[360px] shrink-0 border border-border/50 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden bg-card select-none"
                >
                  <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-primary" />
                  <CardContent className="p-5 pl-6 space-y-4 flex flex-col justify-between h-[180px]">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, idx2) => (
                          <Star 
                            key={idx2} 
                            className={`w-3.5 h-3.5 ${
                              idx2 < (f.rating ?? 5) 
                                ? "fill-amber-400 text-amber-400" 
                                : "text-zinc-200 dark:text-zinc-800"
                            }`} 
                          />
                        ))}
                      </div>
                      <p className="text-[11px] sm:text-xs text-foreground/80 leading-relaxed italic line-clamp-3">
                        "{f.content || f.comments}"
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-3 text-[10px] text-muted-foreground font-sans">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {f.avatarUrl ? (
                          <img 
                            src={f.avatarUrl} 
                            alt={f.author || f.clientName} 
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-indigo-500/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary/20">
                            {getInitial(f.author || f.clientName || "C")}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-foreground block truncate">{f.author || f.clientName}</span>
                          <span className="block mt-0.5 truncate text-[9px]">{f.company || f.clientCompany || "Client"}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {f.projectName && (
                          <span className="font-medium text-primary block truncate max-w-[120px] text-[10px]">{f.projectName}</span>
                        )}
                        <span className="block text-[8px] mt-0.5">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 8. Footer */}
      <footer className="mt-auto border-t bg-card py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2">
            <img src={logo} alt="SBS" className="w-6 h-6 rounded-full object-cover" />
            <span className="font-serif font-bold text-foreground">Strategic Brand Solutions</span>
          </div>
          <p>© {new Date().getFullYear()} Strategic Brand Solutions. All rights reserved.</p>
          <div className="flex justify-center gap-4 text-muted-foreground/80 flex-wrap">
            <span>Email: akhilthadaka97@gmail.com</span>
            <span>•</span>
            <span>Support Portfolio Portal</span>
          </div>
        </div>
      </footer>

      {/* Contact Inquiry Popup Modal — Premium Form */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto border-t-4 border-t-primary p-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl sm:text-2xl text-foreground flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">✦</span>
                Start a Project
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Tell us about yourself and what you're looking to build — we'll get back to you within 24 hours.
              </DialogDescription>
            </DialogHeader>
          </div>

          {contactMutation.isSuccess ? (
            <div className="text-center py-10 px-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold font-serif text-foreground">Inquiry Received!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Thank you. Your project inquiry was submitted successfully. We'll contact you within 24 hours!
              </p>
              <Button variant="outline" size="sm" onClick={() => contactMutation.reset()}>Submit Another</Button>
            </div>
          ) : (
            <form onSubmit={handleContact} className="p-6 space-y-5">

              {/* Row: Name + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cf-name" className="text-xs font-semibold text-foreground">Full Name *</Label>
                  <Input
                    id="cf-name"
                    required
                    placeholder="John Doe"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cf-phone" className="text-xs font-semibold text-foreground">Phone / WhatsApp</Label>
                  <Input
                    id="cf-phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                    className="h-10 text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="cf-email" className="text-xs font-semibold text-foreground">Email Address *</Label>
                <Input
                  id="cf-email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  className="h-10 text-sm"
                />
              </div>

              {/* Project Type — chips */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Project Type</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "website", label: "🌐 Website" },
                    { value: "dashboard", label: "📊 Dashboard" },
                    { value: "fullstack", label: "⚙️ Full Stack Dev" },
                    { value: "saas", label: "☁️ SaaS Application" },
                    { value: "business", label: "💼 Business App" },
                    { value: "socialmedia", label: "📱 Social Media" },
                    { value: "portfolio", label: "🖼️ Portfolio" },
                    { value: "other", label: "✏️ Other" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setContactForm({...contactForm, projectType: opt.value, otherProjectType: ""})}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 ${
                        contactForm.projectType === opt.value
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/40 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* Other — manual input */}
                {contactForm.projectType === "other" && (
                  <Input
                    placeholder="Describe your project type..."
                    value={contactForm.otherProjectType}
                    onChange={(e) => setContactForm({...contactForm, otherProjectType: e.target.value})}
                    className="h-9 text-sm mt-2"
                    autoFocus
                  />
                )}
              </div>

              {/* Why develop / Description */}
              <div className="space-y-1.5">
                <Label htmlFor="cf-desc" className="text-xs font-semibold text-foreground">Why do you want to build this? *</Label>
                <Textarea
                  id="cf-desc"
                  required
                  placeholder="Briefly describe your project goal — e.g. 'I want to build a SaaS dashboard for managing client invoices...'"
                  className="h-24 text-sm resize-none focus-visible:ring-primary"
                  value={contactForm.description}
                  onChange={(e) => setContactForm({...contactForm, description: e.target.value})}
                />
              </div>

              {/* Additional Message */}
              <div className="space-y-1.5">
                <Label htmlFor="cf-msg" className="text-xs font-semibold text-foreground">Additional Details / Requirements</Label>
                <Textarea
                  id="cf-msg"
                  required
                  placeholder="Timeline, budget range, key features, tech preferences, integrations needed..."
                  className="h-24 text-sm resize-none focus-visible:ring-primary"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setContactOpen(false)} className="h-10">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={contactMutation.isPending}
                  className="h-10 bg-primary text-primary-foreground font-semibold flex items-center gap-2 px-6"
                >
                  {contactMutation.isPending ? "Sending..." : "Send Inquiry"} <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
