import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  players: defineTable({
    deviceId: v.string(),
    playerName: v.string(),
    totalRuns: v.number(),
    totalPlayTime: v.number(), // in seconds
    createdAt: v.number(),
  }).index("by_device", ["deviceId"]),

  scores: defineTable({
    playerId: v.optional(v.id("players")),
    deviceId: v.optional(v.string()), 
    playerName: v.optional(v.string()),
    score: v.number(),
    gameResult: v.string(), // "gameover" or "win"
    time: v.optional(v.number()), // legacy completion time
    runTime: v.optional(v.number()), // new completion/survival time in seconds
    createdAt: v.number(),
  })
    .index("by_score", ["score"])
    .index("by_device", ["deviceId"])
    .index("by_player", ["playerId"]),
});
