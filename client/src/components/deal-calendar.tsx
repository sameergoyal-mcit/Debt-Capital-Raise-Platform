import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Clock
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { downloadICS } from "@/lib/download";
import { cn } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "launch" | "nda" | "ioi" | "commitment" | "allocation" | "close" | "other";
  description?: string;
}

interface DealCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  dealName: string;
  role: "Investor" | "Issuer" | "Bookrunner";
}

const eventTypeColors: Record<CalendarEvent["type"], { bg: string; text: string; label: string }> = {
  launch: { bg: "bg-blue-100", text: "text-blue-800", label: "Launch" },
  nda: { bg: "bg-purple-100", text: "text-purple-800", label: "NDA" },
  ioi: { bg: "bg-amber-100", text: "text-amber-800", label: "IOI" },
  commitment: { bg: "bg-green-100", text: "text-green-800", label: "Commitment" },
  allocation: { bg: "bg-cyan-100", text: "text-cyan-800", label: "Allocation" },
  close: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Close" },
  other: { bg: "bg-slate-100", text: "text-slate-800", label: "Event" }
};

export function DealCalendar({ isOpen, onClose, events, dealName, role }: DealCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of month to align with week
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(e.date, date));
  };

  const handleDownloadICS = () => {
    const icsEvents = events.map(e => ({
      title: e.title,
      start: e.date,
      description: e.description || `${dealName} - ${eventTypeColors[e.type].label}`
    }));
    downloadICS(`${dealName.replace(/\s+/g, "_")}_calendar.ics`, icsEvents);
  };

  const upcomingEvents = events
    .filter(e => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Deal Calendar
            </span>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadICS}>
              <Download className="h-4 w-4" />
              Download .ics
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Calendar Grid */}
          <div className="md:col-span-2">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {paddedDays.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="h-16" />;
                }
                
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "h-16 p-1 border rounded-md text-sm",
                      isToday && "border-primary bg-primary/5",
                      !isSameMonth(day, currentMonth) && "opacity-50"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium mb-1",
                      isToday && "text-primary"
                    )}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[9px] px-1 py-0.5 rounded truncate cursor-pointer",
                            eventTypeColors[event.type].bg,
                            eventTypeColors[event.type].text
                          )}
                          onClick={() => setSelectedEvent(event)}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-muted-foreground pl-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda / Details Panel */}
          <div className="space-y-4">
            {selectedEvent ? (
              <Card>
                <CardContent className="p-4">
                  <Badge className={cn(
                    "mb-2",
                    eventTypeColors[selectedEvent.type].bg,
                    eventTypeColors[selectedEvent.type].text
                  )}>
                    {eventTypeColors[selectedEvent.type].label}
                  </Badge>
                  <h4 className="font-semibold mb-1">{selectedEvent.title}</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                    <Clock className="h-3 w-3" />
                    {format(selectedEvent.date, "EEEE, MMMM d, yyyy")}
                  </p>
                  {selectedEvent.description && (
                    <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-xs"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Close
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 text-sm">Upcoming Events</h4>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {upcomingEvents.map(event => (
                        <div 
                          key={event.id}
                          className="flex items-start gap-2 cursor-pointer hover:bg-secondary/50 p-2 rounded-md transition-colors"
                          onClick={() => setSelectedEvent(event)}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full mt-1.5 shrink-0",
                            eventTypeColors[event.type].bg.replace("100", "500")
                          )} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(event.date, "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      ))}
                      {upcomingEvents.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No upcoming events
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Legend */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2 text-sm">Event Types</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(eventTypeColors).map(([type, config]) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div className={cn("w-3 h-3 rounded", config.bg)} />
                      <span className="text-xs">{config.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to generate sample events from deal data
export function generateDealEvents(deal: {
  id: string;
  name: string;
  launchDate?: string;
  ndaDeadline?: string;
  ioiDeadline?: string;
  commitmentDeadline?: string;
  allocationDate?: string;
  expectedCloseDate?: string;
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  if (deal.launchDate) {
    events.push({
      id: `${deal.id}-launch`,
      title: "Deal Launch",
      date: new Date(deal.launchDate),
      type: "launch",
      description: `${deal.name} launch date`
    });
  }
  
  if (deal.ndaDeadline) {
    events.push({
      id: `${deal.id}-nda`,
      title: "NDA Deadline",
      date: new Date(deal.ndaDeadline),
      type: "nda",
      description: "Deadline for NDA execution"
    });
  }
  
  if (deal.ioiDeadline) {
    events.push({
      id: `${deal.id}-ioi`,
      title: "IOI Deadline",
      date: new Date(deal.ioiDeadline),
      type: "ioi",
      description: "Indication of Interest deadline"
    });
  }
  
  if (deal.commitmentDeadline) {
    events.push({
      id: `${deal.id}-commitment`,
      title: "Commitment Deadline",
      date: new Date(deal.commitmentDeadline),
      type: "commitment",
      description: "Final commitment deadline"
    });
  }
  
  if (deal.allocationDate) {
    events.push({
      id: `${deal.id}-allocation`,
      title: "Allocation",
      date: new Date(deal.allocationDate),
      type: "allocation",
      description: "Allocation announcement"
    });
  }
  
  if (deal.expectedCloseDate) {
    events.push({
      id: `${deal.id}-close`,
      title: "Expected Close",
      date: new Date(deal.expectedCloseDate),
      type: "close",
      description: "Expected closing date"
    });
  }
  
  return events;
}
