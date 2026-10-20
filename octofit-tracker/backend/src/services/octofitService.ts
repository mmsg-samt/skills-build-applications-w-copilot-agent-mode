import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  const payload = input as Record<string, unknown> | null | undefined;

  if (!payload || typeof payload !== 'object') {
    throw Object.assign(new Error('Activity payload is required'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = payload;

  if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    throw Object.assign(new Error('userId must be a valid ObjectId'), { status: 400 });
  }

  if (typeof teamId !== 'string' || !mongoose.Types.ObjectId.isValid(teamId)) {
    throw Object.assign(new Error('teamId must be a valid ObjectId'), { status: 400 });
  }

  if (typeof type !== 'string' || !type.trim()) {
    throw Object.assign(new Error('type is required'), { status: 400 });
  }

  if (typeof minutes !== 'number' || Number.isNaN(minutes) || minutes <= 0) {
    throw Object.assign(new Error('minutes must be a positive number'), { status: 400 });
  }

  const existsUser = await User.exists({ _id: userId });
  const existsTeam = await Team.exists({ _id: teamId });

  if (!existsUser || !existsTeam) {
    throw Object.assign(new Error('Referenced user or team not found'), { status: 400 });
  }

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });

  return activity.toObject ? activity.toObject() : activity;
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  const payload = input as Record<string, unknown> | null | undefined;

  if (!payload || typeof payload !== 'object') {
    throw Object.assign(new Error('Team payload is required'), { status: 400 });
  }

  const { name, mascot, members } = payload;

  if (typeof name !== 'string' || !name.trim()) {
    throw Object.assign(new Error('name is required'), { status: 400 });
  }

  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('mascot is required'), { status: 400 });
  }

  const normalizedMembers = Array.isArray(members)
    ? members.map((member) => String(member)).filter((member) => mongoose.Types.ObjectId.isValid(member))
    : [];

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: normalizedMembers,
  });

  return team.toObject ? team.toObject() : team;
}

export async function getLeaderboard() {
  const leaderboard = await Activity.aggregate([
    {
      $group: {
        _id: '$team',
        totalPoints: { $sum: '$points' },
      },
    },
    {
      $lookup: {
        from: 'teams',
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    {
      $unwind: '$team',
    },
    {
      $project: {
        _id: 0,
        teamId: '$_id',
        teamName: '$team.name',
        totalPoints: 1,
      },
    },
    {
      $sort: {
        totalPoints: -1,
        teamName: 1,
      },
    },
  ]);

  return leaderboard.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(_userEmail: string) {
  if (typeof _userEmail !== 'string' || !_userEmail.trim()) {
    throw Object.assign(new Error('userEmail is required'), { status: 400 });
  }

  const userEmail = _userEmail.trim().toLowerCase();
  const user = await User.findOne({ email: userEmail }).lean();

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const recentActivities = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const recentType = recentActivities[0]?.type?.toLowerCase() ?? '';
  const goalFocus = String(user.fitnessGoal ?? '').trim().toLowerCase();
  const preferredFocus = goalFocus || recentType || 'endurance';
  const workouts = await Workout.find().lean();

  const ranked = workouts
    .map((workout) => {
      const focus = String(workout.focus ?? '').trim().toLowerCase();
      let score = 0;
      let reason = 'Recommended based on your recent activity';

      if (focus === preferredFocus) {
        score += 5;
        reason = `Matches your ${preferredFocus} goal and recent activity`;
      }

      if (recentType && focus.includes(recentType)) {
        score += 3;
        reason = `Based on your recent ${recentType} activity`;
      }

      if (focus === goalFocus) {
        score += 2;
      }

      return { ...workout, score, reason };
    })
    .sort((a, b) => b.score - a.score || Number(a.minutes) - Number(b.minutes));

  const bestMatch = ranked[0];

  if (!bestMatch) {
    return [];
  }

  return [{
    title: bestMatch.title,
    focus: bestMatch.focus,
    minutes: bestMatch.minutes,
    difficulty: bestMatch.difficulty,
    reason: bestMatch.reason,
  }];
}

export { User };
