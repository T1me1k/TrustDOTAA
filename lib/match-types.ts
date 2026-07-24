export type MatchStatus = 'idle' | 'searching' | 'accepting' | 'ready' | 'connecting' | 'in_progress' | 'completed' | 'cancelled';
export type AcceptStatus = 'pending' | 'accepted' | 'declined' | 'timed_out';
export type ConnectionStatus = 'pending' | 'connecting' | 'connected' | 'failed';
export type TeamSide = 'radiant' | 'dire';

export interface MatchPlayer {
  id: string;
  steamId64?: string;
  personaName: string;
  avatarUrl?: string;
  profileUrl?: string;
  role: string;
  trustRating: number;
  team: TeamSide;
  isBot?: boolean;
  acceptStatus: AcceptStatus;
  connectionStatus: ConnectionStatus;
  ratingBefore?: number;
  ratingAfter?: number;
  trustScoreBefore?: number;
  trustScoreAfter?: number;
}

export interface MatchTeams { radiant: MatchPlayer[]; dire: MatchPlayer[] }
export interface MatchDetails {
  id: string; status: MatchStatus; roomCode?: string; region?: string;
  teams: MatchTeams; accepted: number; required: number; acceptDeadline?: string;
  inProgressAt?: string; completedAt?: string; cancelledAt?: string;
  winner?: TeamSide; radiantScore?: number; direScore?: number; durationSeconds?: number;
  cancellationReason?: string; cancellationCode?: string; requeued?: boolean;
  currentPlayerId?: string; timeline?: Array<{ status: MatchStatus; at: string; reason?: string }>;
}
export interface MeState { status: MatchStatus; match?: MatchDetails | null; queue?: { regions: string[]; role: string; joinedAt?: string } }
export interface MatchHistoryEntry extends MatchDetails { userTeam?: TeamSide; result?: 'victory' | 'defeat' | 'cancelled'; ratingDelta?: number; trustScoreDelta?: number }
export interface AdminDashboardStats { onlinePlayers: number; queuedPlayers: number; activeMatches: number; completedToday: number; cancelledToday: number; averageQueueSeconds: number; acceptanceRate: number; timeoutRate: number; ratingEvents: number; trustEvents: number }
export interface AdminTimeSeries { from: string; to: string; points: Array<{ at: string; matches: number; completed: number; cancelled: number; acceptanceRate: number }>; regions: Array<{ region: string; matches: number }> }
