import Dexie from "dexie";
import type { Table } from "dexie";


export type ExerciseType = "weight" | "time";

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  description?: string;
  link?: string;
  photos?: string[]; // data URLs
}

export interface SetEntry {
  id: string;
  ts: string;          // ISO date string
  exerciseId: string;
  weight?: number;     // for weight sets
  reps?: number;
  durationSec?: number; // for time sets (later)
}

class GymDB extends Dexie {
  exercises!: Table<Exercise, string>;
  sets!: Table<SetEntry, string>;
  constructor() {
    super("gymdb");
    this.version(1).stores({
      exercises: "&id,name,type",
      sets: "&id,exerciseId,ts",
    });
  }
}

export const db = new GymDB();

export async function seedExercisesIfEmpty() {
  const count = await db.exercises.count();
  if (count > 0) return;

  const defaults: Exercise[] = [
    { id: "db_bench",          name: "Dumbbell Bench Press",                 type: "weight" },
    { id: "db_row",            name: "Dumbbell Row",                         type: "weight" },
    { id: "db_shoulder_press", name: "Dumbbell Shoulder Press",              type: "weight" },
    { id: "db_curl",           name: "Dumbbell Curl",                        type: "weight" },
    { id: "tricep_over",       name: "Unilateral Cable Tricep Ext (Overhand)", type: "weight" },
    { id: "tricep_under",      name: "Unilateral Cable Tricep Ext (Underhand)", type: "weight" },
    { id: "plank",             name: "Plank",                                type: "time" },
    { id: "block_5k",          name: "5K Training Block",                    type: "time" },
  { id: "rest_timer",        name: "Rest",                                 type: "time" },
  ];
  await db.exercises.bulkPut(defaults) // idempotent upsert

}
