import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitScore = mutation({
  args: {
    deviceId: v.string(),
    playerName: v.string(),
    score: v.number(),
    gameResult: v.string(),
    runTime: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Find or create player
    let player = await ctx.db
      .query("players")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .first();

    let playerId;
    if (player) {
      playerId = player._id;
      // Update player stats
      await ctx.db.patch(playerId, {
        playerName: args.playerName, // Update name if it changed
        totalRuns: player.totalRuns + 1,
        totalPlayTime: player.totalPlayTime + args.runTime,
      });
    } else {
      // Create new player
      playerId = await ctx.db.insert("players", {
        deviceId: args.deviceId,
        playerName: args.playerName,
        totalRuns: 1,
        totalPlayTime: args.runTime,
        createdAt: Date.now(),
      });
    }

    // 2. Insert new score record for this run
    await ctx.db.insert("scores", {
      playerId: playerId,
      score: args.score,
      gameResult: args.gameResult,
      runTime: args.runTime,
      createdAt: Date.now(),
      // Keep legacy fields populated to avoid breaking things unexpectedly
      deviceId: args.deviceId,
      playerName: args.playerName,
    });
  },
});


export const submitSuggestion = mutation({
  args: {
    deviceId: v.string(),
    playerName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedMessage = args.message.trim();
    if (!trimmedMessage) {
      throw new Error("Suggestion cannot be empty");
    }

    let player = await ctx.db
      .query("players")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .first();

    let playerId;
    if (player) {
      playerId = player._id;
      await ctx.db.patch(playerId, {
        playerName: args.playerName,
      });
    } else {
      playerId = await ctx.db.insert("players", {
        deviceId: args.deviceId,
        playerName: args.playerName,
        totalRuns: 0,
        totalPlayTime: 0,
        createdAt: Date.now(),
      });
    }

    await ctx.db.insert("suggestions", {
      playerId,
      deviceId: args.deviceId,
      playerName: args.playerName,
      message: trimmedMessage,
      createdAt: Date.now(),
    });
  },
});

export const updateScore = mutation({
  args: {
    id: v.id("scores"),
    newScore: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      score: args.newScore,
    });
  },
});

export const deleteScore = mutation({
  args: {
    id: v.id("scores"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const getTopScores = query({
  args: {},
  handler: async (ctx) => {
    // Get top scores, taking extra to filter down to 10 unique players
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_score")
      .order("desc")
      .take(100);
      
    const result = [];
    const seenPlayers = new Set();
    
    for (const score of scores) {
      // Use playerId if available, fallback to deviceId (or score._id if neither) for old records
      const identifier = score.playerId ?? score.deviceId ?? score._id; 
      
      if (seenPlayers.has(identifier)) continue;
      seenPlayers.add(identifier);
      
      let player = null;
      if (score.playerId) {
        player = await ctx.db.get(score.playerId);
      }
      
      result.push({
        _id: score._id,
        score: score.score,
        gameResult: score.gameResult,
        runTime: score.runTime ?? score.time ?? 0,
        createdAt: score.createdAt,
        playerName: player ? player.playerName : (score.playerName || "Unknown"),
        totalRuns: player ? player.totalRuns : 1, // default to 1 if no player linked
        totalPlayTime: player ? player.totalPlayTime : 0,
      });
      
      if (result.length >= 10) break;
    }
    
    return result;
  },
});

export const getPlayerTopScore = query({
  args: { deviceId: v.string() },
  handler: async (ctx, args) => {
    const scores = await ctx.db
      .query("scores")
      .withIndex("by_device", (q) => q.eq("deviceId", args.deviceId))
      .collect();
    if (!scores || scores.length === 0) return 0;
    return Math.max(...scores.map(s => s.score));
  },
});

export const getSuggestionsForReview = query({
  args: {},
  handler: async (ctx) => {
    const suggestions = await ctx.db
      .query("suggestions")
      .order("desc")
      .take(50);

    return suggestions.map((suggestion) => ({
      _id: suggestion._id,
      playerName: suggestion.playerName,
      message: suggestion.message,
      createdAt: suggestion.createdAt,
    }));
  },
});
