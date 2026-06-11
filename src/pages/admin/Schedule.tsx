import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { 
  Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, 
  Search, Bell, Sparkles, FolderKanban, Check, Trash2, CalendarDays
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PREMIUM_COLORS, getColorForClient, getRandomColor } from "@/lib/colors";

interface Project {
  id: string;
  name: string;
  clientName: string;
  progress: number;
  color?: string;
  status?: string;
}

interface ScheduleTask {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  projectIds: string[];
  projects: { id: string; name: string }[];
  color: string;
}

const getKolkataHour = (d: Date): number => {
  try {
    const str = d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit"
    });
    return parseInt(str, 10);
  } catch (e) {
    return d.getHours();
  }
};

const getKolkataTimeFraction = (d: Date): number => {
  try {
    const timeString = d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
    const [h, m] = timeString.split(":").map(Number);
    return h + m / 60;
  } catch (e) {
    return d.getHours() + d.getMinutes() / 60;
  }
};

const getKolkataDateBounds = (date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(date);
    const month = parts.find(p => p.type === 'month')?.value || "";
    const day = parts.find(p => p.type === 'day')?.value || "";
    const year = parts.find(p => p.type === 'year')?.value || "";
    return {
      start: new Date(`${year}-${month}-${day}T00:00:00+05:30`),
      end: new Date(`${year}-${month}-${day}T23:59:59.999+05:30`)
    };
  } catch (e) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = String(date.getFullYear());
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return {
      start: new Date(`${year}-${month}-${day}T00:00:00+05:30`),
      end: new Date(`${year}-${month}-${day}T23:59:59.999+05:30`)
    };
  }
};


const CALENDAR_SLOTS = [
  { id: "morning", label: "10:00 AM - 02:00 PM", name: "Morning Session", bgClass: "bg-emerald-500/[0.02] border-l-[3px] border-l-emerald-500/30", height: 110 },
  { id: "break", label: "02:00 PM - 03:00 PM", name: "Lunch Break ☕", bgClass: "bg-amber-500/[0.03] border-l-[3px] border-l-amber-400/20 border-dashed", height: 60 },
  { id: "afternoon", label: "03:00 PM - 08:00 PM", name: "Afternoon Session", bgClass: "bg-blue-500/[0.02] border-l-[3px] border-l-blue-500/30", height: 110 }
];

const getClientColor = (clientName: string) => {
  return getColorForClient(clientName);
};

const getContrastTextColor = (bgColor: string) => {
  if (!bgColor) return "#ffffff";
  const cleaned = bgColor.trim().toLowerCase();
  
  if (cleaned.startsWith("oklch")) {
    const match = cleaned.match(/oklch\(\s*([\d.]+)%?/);
    if (match) {
      const l = parseFloat(match[1]);
      const lightness = l > 1 ? l : l * 100;
      return lightness > 60 ? "#1e293b" : "#ffffff";
    }
  }
  
  if (cleaned.startsWith("#")) {
    const hex = cleaned.replace("#", "");
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#1e293b" : "#ffffff";
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#1e293b" : "#ffffff";
    }
  }
  
  if (cleaned.startsWith("hsl")) {
    const match = cleaned.match(/hsl\(\s*\d+\s*,\s*\d+%\s*,\s*([\d.]+)%\s*\)/);
    if (match) {
      const l = parseFloat(match[1]);
      return l > 60 ? "#1e293b" : "#ffffff";
    }
  }
  
  if (cleaned === "#ffdf20") return "#1e293b";
  return "#ffffff";
};

const getSlotTop = (s: number) => {
  let sum = 0;
  for (let i = 0; i < s; i++) {
    sum += CALENDAR_SLOTS[i].height;
  }
  return sum;
};

const getBlockHeight = (startSlot: number, endSlot: number) => {
  let sum = 0;
  for (let i = startSlot; i <= endSlot; i++) {
    sum += CALENDAR_SLOTS[i].height;
  }
  return sum;
};

export default function AdminSchedule() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [searchQuery, setSearchQuery] = useState("");

  const [maxClientsPerDay, setMaxClientsPerDay] = useState<number>(() => Number(localStorage.getItem("sbs_max_clients_per_day") || "2"));

  const handleMaxClientsChange = (val: string) => {
    const num = Number(val);
    setMaxClientsPerDay(num);
    localStorage.setItem("sbs_max_clients_per_day", String(num));
    toast({ title: "Capacity Limit Updated", description: `Daily capacity is now set to ${num} client bookings.` });
  };

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [session, setSession] = useState<"morning" | "afternoon" | "fullday">("morning");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(getRandomColor);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [presetDate, setPresetDate] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });


  // Queries
  const { data: projectsData } = useQuery<{ data: Project[] }>({
    queryKey: ["admin-schedule-projects"],
    queryFn: () => apiFetch<{ data: Project[] }>("/projects?limit=50"),
  });

  const { data: schedulesData, isLoading } = useQuery<{ data: ScheduleTask[] }>({
    queryKey: ["admin-schedules"],
    queryFn: () => apiFetch<{ data: ScheduleTask[] }>("/schedules"),
    refetchInterval: 5000,
  });

  const projects = projectsData?.data ?? [];
  const schedules = schedulesData?.data ?? [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/schedules", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-schedules"] });
      toast({ title: "Task Scheduled ✅", description: "The task has been added to your calendar." });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => apiFetch(`/schedules/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-schedules"] });
      toast({ title: "Task Updated ✅", description: "Schedule has been updated." });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-schedules"] });
      toast({ title: "Task Removed 🗑️", description: "Scheduled task deleted successfully." });
      resetForm();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedProjects([]);
    setSelectedColor(getRandomColor());
    setEditingEventId(null);
    setIsCreateOpen(false);
    setFromDate(presetDate);
    setToDate(presetDate);
    setSession("morning");
  };

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !session) {
      toast({ title: "Fields Required", description: "Dates and session are required.", variant: "destructive" });
      return;
    }

    let startHourStr = "10:00";
    let endHourStr = "14:00";
    if (session === "afternoon") {
      startHourStr = "15:00";
      endHourStr = "20:00";
    } else if (session === "fullday") {
      startHourStr = "10:00";
      endHourStr = "20:00";
    }

    const firstProject = projects.find(p => selectedProjects.includes(p.id));
    const finalTitle = title || (firstProject ? firstProject.name : "Scheduled Task");

    // Capacity limit check
    const startD = new Date(fromDate);
    const endD = new Date(toDate);
    
    let limitExceeded = false;
    let exceededDateStr = "";

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      // Count tasks on this day (exclude editing event)
      const dayTasks = schedules.filter(t => {
        if (editingEventId && t.id === editingEventId) return false;
        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.endDate);
        return tStart < dayEnd && tEnd >= dayStart;
      });

      const hasFullDay = dayTasks.some(t => {
        const start = getKolkataHour(new Date(t.startDate));
        const end = getKolkataHour(new Date(t.endDate));
        return start === 10 && end === 20;
      });

      const totalBookings = dayTasks.length;

      if (hasFullDay || totalBookings >= maxClientsPerDay || (session === "fullday" && totalBookings > 0)) {
        limitExceeded = true;
        exceededDateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        break;
      }
      
      if (maxClientsPerDay === 1 && totalBookings > 0) {
        limitExceeded = true;
        exceededDateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        break;
      }
    }

    if (limitExceeded) {
      toast({
        title: "Capacity Limit Exceeded ⚠️",
        description: `Booking limit of ${maxClientsPerDay} clients is reached on ${exceededDateStr}. Select another slot or increase daily capacity limit.`,
        variant: "destructive"
      });
      return;
    }

    const body = {
      title: finalTitle,
      description,
      startDate: new Date(`${fromDate}T${startHourStr}:00`).toISOString(),
      endDate: new Date(`${toDate}T${endHourStr}:00`).toISOString(),
      projectIds: selectedProjects,
      color: selectedColor,
    };

    if (editingEventId) {
      updateMutation.mutate({ id: editingEventId, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const handleEditClick = (task: ScheduleTask) => {
    setTitle(task.title);
    setDescription(task.description);
    
    const sD = new Date(task.startDate);
    const eD = new Date(task.endDate);
    
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateToYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    
    const fDate = dateToYmd(sD);
    const tDate = dateToYmd(eD);
    setFromDate(fDate);
    setToDate(tDate);
    setPresetDate(fDate);
    
    const startHour = getKolkataHour(sD);
    const endHour = getKolkataHour(eD);
    
    if (startHour === 10 && endHour === 14) {
      setSession("morning");
    } else if (startHour === 15 && endHour === 20) {
      setSession("afternoon");
    } else if (startHour === 10 && endHour === 20) {
      setSession("fullday");
    } else {
      setSession("morning"); // default fallback
    }

    setSelectedProjects(task.projectIds || []);
    setSelectedColor(task.color);
    setEditingEventId(task.id);
    setIsCreateOpen(true);
  };

  // Get week date objects starting from currentDate
  const getWeekDates = (date: Date) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const next = new Date(date);
      next.setDate(date.getDate() + i);
      dates.push(next);
    }
    return dates;
  };

  const weekDates = getWeekDates(new Date(currentDate));

  // Navigate week
  const adjustWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + direction * 7);
    setCurrentDate(next);
  };

  const monthYearLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Filter tasks based on search
  const filteredTasks = schedules.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.projects.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const parseTimeStrToHour = (timeStr: string): number => {
    const [time, ampm] = timeStr.split(" ");
    const [hourStr] = time.split(":");
    let hour = parseInt(hourStr);
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return hour;
  };

  const getTaskClientName = (task: ScheduleTask) => {
    if (task.projectIds && task.projectIds.length > 0) {
      const projId = task.projectIds[0];
      const projectObj = projects.find(p => p.id === projId);
      if (projectObj && projectObj.clientName) {
        return projectObj.clientName;
      }
    }
    return "";
  };

  const getTaskClientColor = (task: ScheduleTask) => {
    if (task.projectIds && task.projectIds.length > 0) {
      const projId = task.projectIds[0];
      const projectObj = projects.find(p => p.id === projId);
      if (projectObj && projectObj.color) {
        return projectObj.color;
      }
      if (projectObj && projectObj.clientName) {
        return getClientColor(projectObj.clientName);
      }
    }
    if (task.color) return task.color;
    return getClientColor(task.title || "Default");
  };

  const getTaskSlotsOverlap = (task: ScheduleTask) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    
    const startHour = getKolkataTimeFraction(taskStart);
    const endHour = getKolkataTimeFraction(taskEnd);
    
    const boundaries = [
      { id: 0, start: 10, end: 14 },
      { id: 1, start: 14, end: 15 },
      { id: 2, start: 15, end: 20 }
    ];
    
    let minSlot = 999;
    let maxSlot = -999;
    
    boundaries.forEach(b => {
      const overlaps = startHour < b.end && endHour > b.start;
      if (overlaps) {
        minSlot = Math.min(minSlot, b.id);
        maxSlot = Math.max(maxSlot, b.id);
      }
    });
    
    if (minSlot === 999) {
      if (startHour < 14) return { startSlot: 0, endSlot: 0 };
      if (startHour < 15) return { startSlot: 1, endSlot: 1 };
      return { startSlot: 2, endSlot: 2 };
    }
    
    return { startSlot: minSlot, endSlot: maxSlot };
  };

  // Check if dates match
  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  // Mini Calendar generation (current month)
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // padding for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const miniCalendarDays = getDaysInMonth(currentDate);

  const getWeekSessionsAvailability = () => {
    const rawBooked: { date: Date; session: string; taskTitle: string; color: string; projectNames: string[] }[] = [];
    const free: { date: Date; session: string }[] = [];

    weekDates.forEach((d) => {
      const bounds = getKolkataDateBounds(d);
      const dayStart = bounds.start;
      const dayEnd = bounds.end;

      // Check Morning (10 AM - 2 PM)
      const morningTasks = schedules.filter(t => {
        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.endDate);
        const isActiveOnDay = tStart < dayEnd && tEnd > dayStart;
        if (!isActiveOnDay) return false;
        
        const startHour = getKolkataHour(tStart);
        const endHour = getKolkataHour(tEnd);
        return startHour < 14 && endHour > 10;
      });

      const isMorningBooked = morningTasks.length > 0;

      // Check Afternoon (3 PM - 8 PM)
      const afternoonTasks = schedules.filter(t => {
        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.endDate);
        const isActiveOnDay = tStart < dayEnd && tEnd > dayStart;
        if (!isActiveOnDay) return false;
        
        const startHour = getKolkataHour(tStart);
        const endHour = getKolkataHour(tEnd);
        return startHour < 20 && endHour > 15;
      });

      const isAfternoonBooked = afternoonTasks.length > 0;

      if (isMorningBooked && isAfternoonBooked) {
        const sameTask = morningTasks[0].id === afternoonTasks[0].id;
        const combinedTitle = sameTask 
          ? morningTasks[0].title 
          : `${morningTasks[0].title} & ${afternoonTasks[0].title}`;
        
        const combinedProjectNames = [
          ...new Set([
            ...(morningTasks[0].projects?.map(p => p.name) || []),
            ...(afternoonTasks[0].projects?.map(p => p.name) || [])
          ])
        ];

        rawBooked.push({
          date: d,
          session: "Full Day (10AM - 8PM)",
          taskTitle: combinedTitle,
          color: getTaskClientColor(morningTasks[0]),
          projectNames: combinedProjectNames
        });
      } else {
        if (isMorningBooked) {
          rawBooked.push({
            date: d,
            session: "Morning (10AM - 2PM)",
            taskTitle: morningTasks[0].title,
            color: getTaskClientColor(morningTasks[0]),
            projectNames: morningTasks[0].projects?.map(p => p.name) || []
          });
        }
        if (isAfternoonBooked) {
          rawBooked.push({
            date: d,
            session: "Afternoon (3PM - 8PM)",
            taskTitle: afternoonTasks[0].title,
            color: getTaskClientColor(afternoonTasks[0]),
            projectNames: afternoonTasks[0].projects?.map(p => p.name) || []
          });
        }
      }

      // Calculate availability based on Capacity Limit rules
      const dayTasks = schedules.filter(t => {
        const tStart = new Date(t.startDate);
        const tEnd = new Date(t.endDate);
        return tStart < dayEnd && tEnd >= dayStart;
      });

      const hasFullDay = dayTasks.some(t => {
        const start = getKolkataHour(new Date(t.startDate));
        const end = getKolkataHour(new Date(t.endDate));
        return start === 10 && end === 20;
      });

      const totalBookings = dayTasks.length;

      let morningAvailable = false;
      let afternoonAvailable = false;

      if (!hasFullDay && totalBookings < maxClientsPerDay) {
        morningAvailable = morningTasks.length === 0;
        afternoonAvailable = afternoonTasks.length === 0;
      }

      if (morningAvailable) {
        free.push({
          date: d,
          session: "Morning (10AM - 2PM)",
        });
      }
      if (afternoonAvailable) {
        free.push({
          date: d,
          session: "Afternoon (3PM - 8PM)",
        });
      }
    });

    // Group consecutive bookings of the same task into date ranges
    const booked: { startDate: Date; endDate: Date; sessionLabel: string; taskTitle: string; color: string; projectNames: string[] }[] = [];
    
    rawBooked.forEach((item) => {
      if (booked.length === 0) {
        booked.push({
          startDate: item.date,
          endDate: item.date,
          sessionLabel: item.session,
          taskTitle: item.taskTitle,
          color: item.color,
          projectNames: item.projectNames
        });
      } else {
        const last = booked[booked.length - 1];
        const sameTask = last.taskTitle === item.taskTitle && last.color === item.color;
        
        const oneDayMs = 24 * 60 * 60 * 1000;
        const d1 = new Date(last.endDate);
        d1.setHours(0,0,0,0);
        const d2 = new Date(item.date);
        d2.setHours(0,0,0,0);
        const diffDays = Math.round((d2.getTime() - d1.getTime()) / oneDayMs);
        const isConsecutive = diffDays === 1;

        if (sameTask && isConsecutive) {
          last.endDate = item.date;
          if (last.sessionLabel !== item.session) {
            if (!last.sessionLabel.includes(item.session)) {
              last.sessionLabel = `${last.sessionLabel}, ${item.session}`;
            }
          }
        } else {
          booked.push({
            startDate: item.date,
            endDate: item.date,
            sessionLabel: item.session,
            taskTitle: item.taskTitle,
            color: item.color,
            projectNames: item.projectNames
          });
        }
      }
    });

    return { booked, free };
  };

  const { booked: bookedSessions, free: freeSessions } = getWeekSessionsAvailability();

  // Find project based on today's booked session or selected date's booked session
  const getActiveProjectFromBooking = () => {
    // 1. Check if there are tasks for the selected date
    const selDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const tasksOnSelectedDate = schedules.filter(t => {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return selDate >= sDate && selDate <= eDate;
    });

    if (tasksOnSelectedDate.length > 0) {
      for (const t of tasksOnSelectedDate) {
        if (t.projectIds && t.projectIds.length > 0) {
          const linkedProj = projects.find(p => p.id === t.projectIds[0]);
          if (linkedProj) return linkedProj;
        }
      }
    }

    // 2. Check today's date tasks
    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tasksOnToday = schedules.filter(t => {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const sDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return todayDate >= sDate && todayDate <= eDate;
    });

    if (tasksOnToday.length > 0) {
      for (const t of tasksOnToday) {
        if (t.projectIds && t.projectIds.length > 0) {
          const linkedProj = projects.find(p => p.id === t.projectIds[0]);
          if (linkedProj) return linkedProj;
        }
      }
    }

    // 3. Fallback to first running project
    return runningProjects.length > 0 ? runningProjects[0] : null;
  };

  // Statistics
  const runningProjects = projects.filter(p => p.progress > 0 && p.progress < 100);
  const activeProject = getActiveProjectFromBooking();
  const editingTask = editingEventId ? schedules.find(t => t.id === editingEventId) : null;

  const totalBookedDays = schedules.reduce((acc, task) => {
    if (task.projectIds && task.projectIds.length > 0) {
      const start = new Date(task.startDate);
      const end = new Date(task.endDate);
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return acc + diffDays;
    }
    return acc;
  }, 0);

  const bookedDaysInWeek = weekDates.filter(d => {
    const bounds = getKolkataDateBounds(d);
    const dayStart = bounds.start;
    const dayEnd = bounds.end;

    const hasM = schedules.some(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      if (!(tStart < dayEnd && tEnd > dayStart)) return false;
      return getKolkataHour(tStart) < 14 && getKolkataHour(tEnd) > 10;
    });
    const hasA = schedules.some(t => {
      const tStart = new Date(t.startDate);
      const tEnd = new Date(t.endDate);
      if (!(tStart < dayEnd && tEnd > dayStart)) return false;
      return getKolkataHour(tStart) < 20 && getKolkataHour(tEnd) > 15;
    });
    return hasM || hasA;
  }).length;

  const leftDaysInWeek = Math.max(0, 7 - bookedDaysInWeek);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-pink-500 to-violet-500" />
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">My Schedule</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            {runningProjects.length} Running Client Projects
          </p>
        </div>

        {/* Dynamic Developer Stats Block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-row gap-4 w-full md:w-auto">
          {/* Stat 1: Total Days Booked */}
          <div className="flex items-center gap-3 bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 shadow-xs shrink-0">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-500/20">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Total Project Days Booked</p>
              <p className="text-base font-black text-foreground mt-1 leading-none">{totalBookedDays} Days</p>
            </div>
          </div>

          {/* Stat 2: Left/Unbooked Days */}
          <div className="flex items-center gap-3 bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 shadow-xs shrink-0">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider leading-none">Unbooked Days Left</p>
              <p className="text-base font-black text-foreground mt-1 leading-none">{leftDaysInWeek} Days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Grid Calendar Content - Spans 3 cols */}
        <div className="xl:col-span-3 space-y-6">
          <Card className="shadow-md border-border/60">
            <CardHeader className="py-3 px-5 border-b border-border/40 bg-muted/5">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-extrabold font-serif">{monthYearLabel}</CardTitle>
                    <CardDescription className="text-[10px] text-muted-foreground/85">Schedule tasks and client meetings</CardDescription>
                  </div>
                </div>

                {/* View Toggles & Month Navigation */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted/60 px-2.5 py-1 rounded-lg border border-border/40 shrink-0">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Limit:</span>
                    <select
                      value={String(maxClientsPerDay)}
                      onChange={(e) => handleMaxClientsChange(e.target.value)}
                      className="bg-card border border-border/50 text-[10px] font-bold rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-primary text-foreground"
                    >
                      <option value="1">1 Client</option>
                      <option value="2">2 Clients</option>
                      <option value="3">3 Clients</option>
                    </select>
                  </div>

                  <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/40">
                    <button
                      type="button"
                      onClick={() => setViewMode("week")}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                        viewMode === "week"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Week
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("month");
                        toast({ title: "Month View", description: "Monthly task summaries are highlighted on the right panel.", variant: "default" });
                      }}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                        viewMode === "month"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Month
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustWeek(-1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-xs px-2 h-7" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustWeek(1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[700px] divide-y divide-border/50">
                {/* Calendar Days Header */}
                <div className="grid grid-cols-8 bg-muted/20 text-center font-semibold text-xs py-3 border-b border-border/40">
                  <div className="text-muted-foreground font-medium uppercase tracking-wider text-left pl-4 self-center">Time</div>
                  {weekDates.map((date, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
                        isToday(date) 
                          ? "bg-primary/5 text-primary" 
                          : "text-foreground hover:bg-muted/30"
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                      <span className={`text-base font-black mt-0.5 w-7 h-7 rounded-full flex items-center justify-center ${
                        isToday(date) ? "bg-primary text-white shadow-md shadow-primary/30" : ""
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Time Slots Grid */}
                {viewMode === "week" ? (
                  <div className="relative min-w-[700px] h-[280px] bg-background select-none overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 flex flex-col divide-y divide-border/30">
                      {CALENDAR_SLOTS.map((slot) => (
                        <div key={slot.id} className="grid grid-cols-8 divide-x divide-border/30" style={{ height: `${slot.height}px` }}>
                          {/* Time label cell */}
                          <div className="col-span-1 flex flex-col justify-center pl-3 bg-muted/5 border-b border-border/10 select-none gap-0.5" style={{ height: `${slot.height}px` }}>
                            <span className="font-black text-xs sm:text-sm text-foreground/90 truncate">{slot.name}</span>
                            <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-semibold truncate">{slot.label}</span>
                          </div>
                          {/* 7 Days cells */}
                          {weekDates.map((date, dateIdx) => {
                            const isTodayCol = isToday(date);
                            const isSelectedCol = isSelected(date);
                            let cellBgClass = slot.bgClass;
                            if (isTodayCol) cellBgClass = "bg-primary/[0.015]";
                            if (isSelectedCol) cellBgClass = "bg-secondary/[0.015]";
                            
                            return (
                              <div
                                key={dateIdx}
                                onClick={() => {
                                  const pad = (n: number) => String(n).padStart(2, "0");
                                  const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                                  setPresetDate(dateStr);
                                  setFromDate(dateStr);
                                  setToDate(dateStr);
                                  if (slot.id === "morning") {
                                    setSession("morning");
                                  } else if (slot.id === "afternoon") {
                                    setSession("afternoon");
                                  } else {
                                    // Map break click to morning
                                    setSession("morning");
                                  }
                                  setIsCreateOpen(true);
                                }}
                                className={`relative transition-colors cursor-pointer hover:bg-muted/10 border-b border-border/10 ${cellBgClass}`}
                                style={{ height: `${slot.height}px` }}
                              >
                                {slot.id === "break" && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-[7.5px] font-bold text-amber-500/15 uppercase">Break</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Foreground Tasks overlay container */}
                    <div className="absolute inset-0 pointer-events-none">
                      {filteredTasks.map((task) => {
                        const taskStart = new Date(task.startDate);
                        const taskEnd = new Date(task.endDate);

                        let startDayIdx = -1;
                        let endDayIdx = -1;

                        for (let i = 0; i < 7; i++) {
                          const d = weekDates[i];
                          const dayStart = new Date(d);
                          dayStart.setHours(0, 0, 0, 0);
                          const dayEnd = new Date(d);
                          dayEnd.setHours(23, 59, 59, 999);

                          if (taskStart <= dayEnd && taskEnd >= dayStart) {
                            if (startDayIdx === -1) startDayIdx = i;
                            endDayIdx = i;
                          }
                        }

                        if (startDayIdx === -1) return null;

                        const { startSlot, endSlot } = getTaskSlotsOverlap(task);

                        const leftPct = (startDayIdx + 1) * 12.5;
                        const widthPct = (endDayIdx - startDayIdx + 1) * 12.5;

                        const topPx = getSlotTop(startSlot) + 2;
                        const heightPx = getBlockHeight(startSlot, endSlot) - 4;

                        const clientColor = getTaskClientColor(task);
                        const clientName = getTaskClientName(task);

                        const formatTime = (d: Date) => {
                          try {
                            return d.toLocaleTimeString("en-US", {
                              timeZone: "Asia/Kolkata",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true
                            });
                          } catch (e) {
                            let h = d.getHours();
                            const m = d.getMinutes();
                            const ampm = h >= 12 ? "PM" : "AM";
                            h = h % 12 === 0 ? 12 : h % 12;
                            return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
                          }
                        };

                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => handleEditClick(task)}
                            className="absolute rounded-xl shadow-md p-1.5 flex flex-col justify-center items-center text-center z-10 cursor-pointer border hover:shadow-lg transition-all hover:scale-[1.005] pointer-events-auto"
                            style={{
                              left: `calc(${leftPct}% + 3px)`,
                              width: `calc(${widthPct}% - 6px)`,
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              backgroundColor: clientColor,
                              color: getContrastTextColor(clientColor),
                              borderColor: `${clientColor}aa`
                            }}
                          >
                            <div className="space-y-1 overflow-hidden select-none w-full max-w-full px-2 py-1">
                              {clientName && (
                                <p className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-95 truncate">
                                  {clientName}
                                </p>
                              )}
                              {task.projects && task.projects.length > 0 && (
                                <p className="text-[11px] sm:text-xs opacity-90 font-bold truncate">
                                  Project: {task.projects.map(p => p.name).join(", ")}
                                </p>
                              )}
                              <p className="text-[10px] sm:text-xs opacity-90 font-bold tracking-wide flex items-center justify-center gap-1">
                                🕒 {formatTime(taskStart)} - {formatTime(taskEnd)}
                              </p>
                              {heightPx >= 85 && task.description && (
                                <p className="text-[10px] sm:text-xs opacity-80 line-clamp-2 max-w-md mx-auto font-medium leading-tight">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Month Grid Placeholder inside content
                  <div className="p-8 text-center text-muted-foreground text-sm space-y-2">
                    <CalendarDays className="w-12 h-12 mx-auto text-primary animate-pulse" />
                    <p className="font-semibold text-foreground text-base font-serif">Month View Enabled</p>
                    <p className="max-w-md mx-auto text-xs">
                      All schedules and milestones are organized dynamically. Check the interactive mini-calendar and tasks in the right-hand panel for details.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Session Availability Widget */}
          <Card className="shadow-md border-border/60">
            <CardHeader className="py-4 px-5 border-b border-border/40 bg-muted/5">
              <CardTitle className="text-sm font-extrabold font-serif uppercase tracking-wider text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary animate-pulse" /> Session Availability Summary (7-Day Report)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Booked Column */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Booked Sessions ({bookedSessions.length})
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {bookedSessions.map((bs, i) => {
                      const dateLabel = bs.startDate.toDateString() === bs.endDate.toDateString()
                        ? bs.startDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
                        : `${bs.startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} - ${bs.endDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;

                      return (
                        <div key={i} className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm">
                          <div className="space-y-1">
                            <p className="font-extrabold text-sm text-foreground">
                              {dateLabel}
                            </p>
                            <p className="text-muted-foreground font-semibold text-xs flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground/75" /> {bs.sessionLabel}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const taskObj = schedules.find(t => t.title === bs.taskTitle);
                              if (taskObj) {
                                handleEditClick(taskObj);
                              }
                            }}
                            className="text-xs px-3.5 py-2 rounded-lg font-extrabold shadow-sm hover:opacity-90 transition-opacity self-start sm:self-center uppercase tracking-wider text-center max-w-[200px] truncate"
                            style={{ 
                              backgroundColor: bs.color,
                              color: getContrastTextColor(bs.color)
                            }}
                          >
                            {bs.projectNames && bs.projectNames.length > 0 ? bs.projectNames.join(", ") : "Scheduled"}
                          </button>
                        </div>
                      );
                    })}
                    {bookedSessions.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-muted/5">
                        <p className="text-xs text-muted-foreground/60 font-medium">No booked slots this week.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Column */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2 border-b border-border/40 pb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Available Slots ({freeSessions.length})
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {freeSessions.map((fs, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm">
                        <div className="space-y-1">
                          <p className="font-extrabold text-sm text-foreground">
                            {fs.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                          </p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500" /> {fs.session}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 rounded-lg shadow-sm self-start sm:self-center"
                          onClick={() => {
                            const pad = (n: number) => String(n).padStart(2, "0");
                            const dateStr = `${fs.date.getFullYear()}-${pad(fs.date.getMonth() + 1)}-${pad(fs.date.getDate())}`;
                            setPresetDate(dateStr);
                            setFromDate(dateStr);
                            setToDate(dateStr);
                            if (fs.session.includes("Morning")) {
                              setSession("morning");
                            } else if (fs.session.includes("Afternoon")) {
                              setSession("afternoon");
                            } else {
                              setSession("fullday");
                            }
                            setIsCreateOpen(true);
                          }}
                        >
                          + Book Session
                        </Button>
                      </div>
                    ))}
                    {freeSessions.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-muted/5">
                        <p className="text-xs text-muted-foreground/60 font-medium">Fully booked this week! 🎉</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Spans 1 col */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* Add New Task Button */}
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="w-full bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-sm h-12 rounded-xl shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/35 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5 animate-pulse" /> Add New Task
          </Button>

          {/* Mini Calendar Monthly Widget */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-3 border-b border-border/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Calendar</CardTitle>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    const prev = new Date(currentDate);
                    prev.setMonth(currentDate.getMonth() - 1);
                    setCurrentDate(prev);
                  }}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                    const next = new Date(currentDate);
                    next.setMonth(currentDate.getMonth() + 1);
                    setCurrentDate(next);
                  }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i} className="text-muted-foreground font-bold py-1">{d}</span>
                ))}
                {miniCalendarDays.map((date, idx) => {
                  if (!date) return <span key={`empty-${idx}`} />;
                  const isDateToday = isToday(date);
                  const isDateSelected = date.toDateString() === selectedDate.toDateString();
                  // Check if date has tasks
                  const dayTasks = schedules.filter(t => new Date(t.startDate).toDateString() === date.toDateString());
                  const hasTasks = dayTasks.length > 0;
                  const dayClientColor = hasTasks ? getTaskClientColor(dayTasks[0]) : null;
                  
                  let btnClass = "w-9 h-9 rounded-lg flex flex-col items-center justify-center relative transition-all mx-auto text-xs font-bold border border-transparent shadow-xs ";
                  let btnStyle: React.CSSProperties = {};

                  if (hasTasks) {
                    btnStyle.backgroundColor = dayClientColor || undefined;
                    btnClass += "text-white font-extrabold ";
                    if (isDateSelected) {
                      btnClass += "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 scale-105 z-10 ";
                    } else {
                      btnClass += "hover:opacity-90 ";
                    }
                  } else {
                    if (isDateSelected) {
                      btnClass += "bg-primary text-white font-extrabold ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 scale-105 z-10 ";
                    } else if (isDateToday) {
                      btnClass += "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/25 hover:bg-rose-500/20 ";
                    } else {
                      btnClass += "text-muted-foreground/75 bg-muted/20 dark:text-muted-foreground/70 hover:bg-muted hover:text-foreground ";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedDate(date);
                        setCurrentDate(new Date(date));
                      }}
                      className={btnClass}
                      style={btnStyle}
                    >
                      <span>{date.getDate()}</span>
                      {hasTasks && (
                        <span className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${isDateSelected ? "bg-white" : "bg-white/80"}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>



          {/* Active Project Card */}
          <Card className="shadow-sm border-border/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Active Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeProject ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground truncate max-w-[150px]">{activeProject.name}</h4>
                    <Badge variant="secondary" className="text-[9px] bg-blue-500/10 text-blue-500 font-bold border-blue-500/20 border">
                      {activeProject.progress}% Done
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${activeProject.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    This project is actively being updated. Click project details to view active task boards.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No running projects at the moment.</p>
              )}
            </CardContent>
          </Card>

          {/* Reminders Notifications Widget */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2 border-b border-border/30">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-primary" /> Reminders
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[
                  { title: "Weekly client status meeting", desc: "Briefing calls start at 11:30 AM Wed", time: "11:30 AM" },
                  { title: "Invoice followups", desc: "Check verifying payment screenshots logs", time: "02:00 PM" },
                  { title: "Review brand strategy draft", desc: "For TechFlow Brand client", time: "05:00 PM" }
                ].map((rem, i) => (
                  <div key={i} className="px-4 py-3 flex justify-between items-start gap-2 hover:bg-muted/10 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{rem.title}</p>
                      <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">{rem.desc}</p>
                    </div>
                    <span className="text-[9px] font-bold text-primary shrink-0 bg-primary/10 px-1.5 py-0.5 rounded">{rem.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Task Creation / Editing Modal */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="pb-1 shrink-0">
            <DialogTitle className="font-serif text-lg font-bold">{editingEventId ? "Edit Scheduled Task" : "Schedule New Task"}</DialogTitle>
          </DialogHeader>

          {/* Dynamic Client & Booking Visual Info Container */}
          {(editingEventId || selectedProjects.length > 0) && (
            <div className="mt-2 mb-3 p-3.5 rounded-xl border border-border/85 bg-muted/30 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Client Details</span>
                {editingEventId && editingTask ? (
                  <span 
                    className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-xs"
                    style={{ 
                      backgroundColor: getTaskClientColor(editingTask),
                      color: getContrastTextColor(getTaskClientColor(editingTask))
                    }}
                  >
                    {getTaskClientName(editingTask) || "Direct Schedule"}
                  </span>
                ) : (
                  projects.find(p => selectedProjects.includes(p.id)) && (
                    <span 
                      className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-xs"
                      style={{ 
                        backgroundColor: getClientColor(projects.find(p => selectedProjects.includes(p.id))?.clientName || ""),
                        color: getContrastTextColor(getClientColor(projects.find(p => selectedProjects.includes(p.id))?.clientName || ""))
                      }}
                    >
                      {projects.find(p => selectedProjects.includes(p.id))?.clientName}
                    </span>
                  )
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-extrabold text-foreground">
                  Linked Project:{" "}
                  <span className="text-primary font-bold">
                    {editingEventId && editingTask
                      ? editingTask.projects.map(p => p.name).join(", ") || "None"
                      : selectedProjects.map(id => projects.find(p => p.id === id)?.name).filter(Boolean).join(", ") || "None"}
                  </span>
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                  <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Scheduled Time:</span>
                  <span className="text-foreground font-bold">
                    {fromDate} {session === "morning" ? "(10:00 AM - 02:00 PM)" : session === "afternoon" ? "(03:00 PM - 08:00 PM)" : "(10:00 AM - 08:00 PM)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateOrUpdate} className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Fields Body */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[55vh] py-2">


              <div className="space-y-1.5">
                <Label htmlFor="task-desc" className="font-bold text-xs text-foreground/80 tracking-wide">Description</Label>
                <Textarea
                  id="task-desc"
                  placeholder="Details about meeting agenda or tasks..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs p-3 border-border shadow-sm focus-visible:ring-primary"
                />
              </div>

              {/* Date Range Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="from-date" className="font-bold text-xs text-foreground/80 tracking-wide">From Date</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    required
                    className="h-10 text-xs px-3 border-border shadow-sm focus-visible:ring-primary bg-card"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to-date" className="font-bold text-xs text-foreground/80 tracking-wide">To Date</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    required
                    className="h-10 text-xs px-3 border-border shadow-sm focus-visible:ring-primary bg-card"
                  />
                </div>
              </div>

              {/* Session Block Selector */}
              <div className="space-y-2.5 border border-border p-4 rounded-xl bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Session Block
                  </Label>
                  <p className="text-[10px] text-muted-foreground">Select a session preset to apply standard working hours.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setSession("morning")}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all border flex flex-col justify-center items-center ${
                      session === "morning"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-extrabold shadow-xs"
                        : "border-border/40 hover:bg-muted text-muted-foreground bg-card"
                    }`}
                  >
                    <span>Morning Session</span>
                    <span className="text-[8px] opacity-75 font-medium">10:00 AM - 02:00 PM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSession("afternoon")}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all border flex flex-col justify-center items-center ${
                      session === "afternoon"
                        ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-extrabold shadow-xs"
                        : "border-border/40 hover:bg-muted text-muted-foreground bg-card"
                    }`}
                  >
                    <span>Afternoon Session</span>
                    <span className="text-[8px] opacity-75 font-medium">03:00 PM - 08:00 PM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSession("fullday")}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all border flex flex-col justify-center items-center ${
                      session === "fullday"
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-xs"
                        : "border-border/40 hover:bg-muted text-muted-foreground bg-card"
                    }`}
                  >
                    <span>Full Day</span>
                    <span className="text-[8px] opacity-75 font-medium">10:00 AM - 08:00 PM</span>
                  </button>
                </div>
              </div>

              {/* Select Projects & Colors side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Projects (Allows Multi-Select via Checkboxes) */}
                <div className="space-y-2.5 border border-border p-4 rounded-xl bg-muted/20 flex flex-col justify-between h-full min-h-[160px]">
                  <div>
                    <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-primary" /> Associated Projects
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">Link this schedule with projects.</p>
                  </div>
                  {(() => {
                    const activeProjects = projects.filter(p => p.status !== 'completed');
                    const completedProjects = projects.filter(p => p.status === 'completed');
                    
                    return (
                      <div className="max-h-36 overflow-y-auto space-y-3 pr-2 flex-1 scrollbar-thin">
                        {activeProjects.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-1">Active Projects</div>
                            {activeProjects.map((p) => {
                              const isChecked = selectedProjects.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProjects(prev =>
                                      isChecked ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                    );
                                  }}
                                  className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted/70 transition-colors border border-border/40 bg-card"
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    isChecked ? "bg-primary border-primary text-white" : "border-border bg-card"
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="truncate text-foreground font-medium">
                                    {p.name} <span className="text-muted-foreground/75 text-[9px] font-bold">({p.clientName})</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        {completedProjects.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Completed Projects</div>
                            {completedProjects.map((p) => {
                              const isChecked = selectedProjects.includes(p.id);
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProjects(prev =>
                                      isChecked ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                    );
                                  }}
                                  className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted/70 transition-colors border border-border/40 bg-card opacity-70 hover:opacity-100"
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    isChecked ? "bg-primary border-primary text-white" : "border-border bg-card"
                                  }`}>
                                    {isChecked && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className="truncate text-muted-foreground font-medium line-through decoration-muted-foreground/40">
                                    {p.name} <span className="text-muted-foreground/75 text-[9px] font-bold">({p.clientName})</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {projects.length === 0 && (
                          <span className="text-[11px] text-muted-foreground">No projects found.</span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Color selection */}
                <div className="space-y-2.5 border border-border p-4 rounded-xl bg-muted/20 flex flex-col justify-between h-full min-h-[160px]">
                  <div className="flex justify-between items-center">
                    <div>
                      <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> Label Theme Color
                      </Label>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Color tag for visual tracking.</p>
                      <p className="text-[8px] text-amber-500 font-bold mt-1 uppercase tracking-wide leading-none animate-pulse">
                        ⚠️ Syncs color to linked client project
                      </p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-bold leading-none select-none">
                      {selectedColor}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 xs:grid-cols-8 gap-1.5 max-h-[100px] overflow-y-auto border border-border/50 rounded-xl p-2 bg-muted/20 select-none custom-scrollbar">
                    {PREMIUM_COLORS.map((col) => {
                      const isSelected = selectedColor.toLowerCase() === col.value.toLowerCase();
                      return (
                        <button
                          key={col.value}
                          type="button"
                          onClick={() => setSelectedColor(col.value)}
                          style={{ backgroundColor: col.value }}
                          className="w-5.5 h-5.5 rounded-full relative transition-all hover:scale-110 active:scale-95 flex items-center justify-center shrink-0 shadow-xs border border-black/10"
                          title={col.name}
                        >
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="flex justify-between items-center pt-3 mt-3 border-t border-border/50 shrink-0 bg-background">
              {editingEventId ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(editingEventId)}
                  className="h-10 px-4 rounded-xl font-bold transition-all hover:-translate-y-0.5"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-10 px-4 rounded-xl font-semibold">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="h-10 px-5 rounded-xl font-bold transition-all hover:-translate-y-0.5">
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingEventId
                    ? "Update Task"
                    : "Schedule Task"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
