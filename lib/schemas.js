import { z } from "zod";

// Matches "YYYY-MM-DD" or empty string
const dateOrEmpty = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default("");

export const HabitSchema = z.object({
  id:        z.string().min(1).max(64),
  name:      z.string().min(1).max(120),
  category:  z.enum(["work", "health", "learning", "personal", "social"]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/),
  days:      z.array(z.number().int().min(0).max(6)).min(1),
});

export const MilestoneSchema = z.object({
  id:   z.string().min(1).max(64),
  text: z.string().min(1).max(200),
  done: z.boolean(),
});

export const ProjectSchema = z.object({
  id:        z.string().min(1).max(64),
  name:      z.string().min(1).max(120),
  desc:      z.string().max(500).default(""),
  status:    z.enum(["on-track", "at-risk", "blocked", "done", "paused"]),
  priority:  z.enum(["high", "medium", "low"]),
  progress:  z.number().int().min(0).max(100),
  dueDate:   dateOrEmpty,
  stage:     z.enum(["planning","requirements","design","development","testing","deployment","maintenance"]),
  ci:        z.number().int().min(0).max(4),
  milestones: z.array(MilestoneSchema).default([]),
  developer:  z.string().max(100).default(""),
});

export const SprintItemSchema = z.object({
  id:        z.string().min(1).max(64),
  text:      z.string().min(1).max(300),
  projectId: z.string().max(64).default(""),
  status:    z.enum(["backlog", "inprogress", "done"]),
});

export const SprintSchema = z.object({
  id:        z.string().min(1).max(64),
  name:      z.string().min(1).max(120),
  goal:      z.string().max(500).default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:   dateOrEmpty,
  completed: z.boolean().default(false),
  items:     z.array(SprintItemSchema).default([]),
});

export const WishSchema = z.object({
  id:         z.string().min(1).max(64),
  title:      z.string().min(1).max(200),
  type:       z.enum(["dream", "buy"]),
  category:   z.string().min(1).max(32),
  priority:   z.enum(["must", "want", "dream"]),
  notes:      z.string().max(1000).default(""),
  targetDate: dateOrEmpty,
  price:      z.string().max(20).default(""),
  done:       z.boolean().default(false),
  createdAt:  z.string().optional(),
});

export const TaskSchema = z.object({
  id:        z.string().min(1).max(64),
  text:      z.string().min(1).max(300),
  done:      z.boolean(),
  priority:  z.enum(["high", "medium", "low"]),
  projectId: z.string().max(64).default(""),
});

export const MeetingSchema = z.object({
  id:    z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  notes: z.string().max(2000).default(""),
  ts:    z.string(),
});

export const LogSchema = z.object({
  wins:        z.string().max(2000).default(""),
  blockers:    z.string().max(2000).default(""),
  plans:       z.string().max(2000).default(""),
  mood:        z.number().int().min(0).max(4).nullable().default(null),
  timeWorked:  z.number().int().min(0).max(1440).default(0),
  tasks:       z.array(TaskSchema).default([]),
  meetings:    z.array(MeetingSchema).default([]),
  decisions:   z.array(z.unknown()).default([]),
});

export const ExpenseSchema = z.object({
  id:            z.string().min(1).max(64),
  amount:        z.number().min(0).max(1e12),
  type:          z.enum(["expense", "income", "savings"]).default("expense"),
  category:      z.string().min(1).max(40),
  note:          z.string().max(300).default(""),
  paymentMethod: z.enum(["cash", "card", "upi", "bank", "other"]).default("cash"),
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt:     z.string().optional(),
});

export const BudgetSchema = z.object({
  id:           z.string().min(1).max(64),
  category:     z.string().min(1).max(40),
  monthlyLimit: z.number().min(0).max(1e12),
});

export const ChatMessageSchema = z.object({
  role:    z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error("Validation failed");
    err.status = 400;
    err.details = result.error.issues;
    throw err;
  }
  return result.data;
}
