/**
 * Gameshow Engine for "Thanh Âm Đại Ngàn"
 * Manages full tournament state: teams, points, functional cards, rounds 1-4,
 * and the Grand Finale.
 */

export type FunctionalCardType = 'steal_points' | 'block_turn' | 'shield';

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  cards: {
    steal_points: number; // Thẻ cướp điểm
    block_turn: number;   // Thẻ cấm lượt
    shield: number;       // Thẻ khiên bảo vệ
  };
  silverTorch: boolean;   // Thẻ Đuốc Bạc (x2)
  goldTorch: boolean;     // Thẻ Đuốc Vàng (x3)
  isEliminatedInRound1?: boolean;
  isBlockedNextQuestion?: boolean;
}

export interface ScoreDeltaEvent {
  teamId: string;
  delta: number;
  newScore: number;
  reason: string;
}

export class GameshowEngine {
  teams: Team[] = [];
  currentRound: 1 | 2 | 3 | 4 | 'finale' = 1;
  currentQuestionIndex = 0;
  preyPot = 0; // Quỹ Săn Mồi trong Vòng 4

  // Vòng 1: Trạng thái 9 ô
  r1OpenedTiles: boolean[] = Array(9).fill(false);
  r1AnsweredCount = 0;

  // Lịch sử biến động điểm gần nhất để kích hoạt hiệu ứng 4-5s
  lastScoreDeltas: ScoreDeltaEvent[] = [];

  // Quản lý 4 Chìa Khóa mở phong ấn Trống Đồng Đông Sơn
  completedStations: Set<string> = new Set();

  markStationCompleted(stationId: string): boolean {
    const isNew = !this.completedStations.has(stationId);
    this.completedStations.add(stationId);
    return isNew;
  }

  getCollectedKeysCount(): number {
    return this.completedStations.size;
  }

  isStationCompleted(stationId: string): boolean {
    return this.completedStations.has(stationId);
  }

  hasAllKeys(): boolean {
    return this.completedStations.size >= 4;
  }

  constructor(teamNames?: string[]) {
    this.initTeams(teamNames);
  }

  initTeams(names?: string[]) {
    const defaultColors = ['#e74c3c', '#f39c12', '#27ae60', '#2980b9'];
    const defaultNames = ['Đội Voi Tây Nguyên', 'Đội Chim Lạc', 'Đội Rừng Xanh', 'Đội Sao Vàng'];

    const chosenNames = names && names.length >= 2 ? names : defaultNames;

    this.teams = chosenNames.map((name, idx) => ({
      id: `team_${idx + 1}`,
      name,
      color: defaultColors[idx % defaultColors.length],
      score: 0,
      cards: {
        steal_points: 0,
        block_turn: 0,
        shield: 0,
      },
      silverTorch: true,
      goldTorch: true,
      isEliminatedInRound1: false,
      isBlockedNextQuestion: false,
    }));
  }

  /**
   * Cộng hoặc trừ điểm có ghi nhận sự kiện cho hiệu ứng
   */
  modifyScore(teamId: string, delta: number, reason = ''): ScoreDeltaEvent | undefined {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return undefined;
    team.score += delta;
    const event: ScoreDeltaEvent = {
      teamId,
      delta,
      newScore: team.score,
      reason,
    };
    this.lastScoreDeltas.push(event);
    return event;
  }

  clearLastDeltas() {
    this.lastScoreDeltas = [];
  }

  /**
   * Trao Thẻ Chức Năng cho Đội
   */
  awardCard(teamId: string, cardType: FunctionalCardType): boolean {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return false;
    team.cards[cardType] += 1;
    return true;
  }

  /**
   * Kích hoạt Thẻ Cướp Điểm: Rút 20đ từ victimTeam chuyển về userTeam
   * Trừ khi victimTeam có Thẻ Khiên Bảo Vệ để phản đòn!
   */
  useStealPointsCard(userTeamId: string, targetTeamId: string): { success: boolean; shielded: boolean; message: string } {
    const user = this.teams.find((t) => t.id === userTeamId);
    const target = this.teams.find((t) => t.id === targetTeamId);
    if (!user || !target || user.cards.steal_points <= 0) {
      return { success: false, shielded: false, message: 'Không thể sử dụng thẻ cướp điểm.' };
    }

    user.cards.steal_points -= 1;

    // Kiểm tra Khiên bảo vệ của target
    if (target.cards.shield > 0) {
      target.cards.shield -= 1; // Tiêu thụ khiên
      return {
        success: false,
        shielded: true,
        message: `${target.name} đã dùng [THẺ KHIÊN BẢO VỆ] hóa giải hoàn toàn đòn cướp điểm!`,
      };
    }

    // Thực hiện cướp 20 điểm
    this.modifyScore(target.id, -20, 'Bị cướp 20 điểm');
    this.modifyScore(user.id, +20, 'Cướp thành công 20 điểm');

    return {
      success: true,
      shielded: false,
      message: `${user.name} đã cướp thành công 20 điểm từ ${target.name}!`,
    };
  }

  /**
   * Kích hoạt Thẻ Cấm Lượt: Khóa quyền trả lời/chuông ở câu kế tiếp
   */
  useBlockTurnCard(userTeamId: string, targetTeamId: string): { success: boolean; shielded: boolean; message: string } {
    const user = this.teams.find((t) => t.id === userTeamId);
    const target = this.teams.find((t) => t.id === targetTeamId);
    if (!user || !target || user.cards.block_turn <= 0) {
      return { success: false, shielded: false, message: 'Không thể sử dụng thẻ cấm lượt.' };
    }

    user.cards.block_turn -= 1;

    // Kiểm tra Khiên
    if (target.cards.shield > 0) {
      target.cards.shield -= 1;
      return {
        success: false,
        shielded: true,
        message: `${target.name} đã kích hoạt [THẺ KHIÊN] vô hiệu hóa lệnh cấm lượt!`,
      };
    }

    target.isBlockedNextQuestion = true;
    return {
      success: true,
      shielded: false,
      message: `${target.name} đã bị khóa lượt trả lời ở câu tiếp theo!`,
    };
  }

  /**
   * Xóa trạng thái cấm lượt sau mỗi câu
   */
  consumeBlockedTurns() {
    this.teams.forEach((t) => {
      t.isBlockedNextQuestion = false;
    });
  }

  /**
   * Tính điểm dự đoán Bức Tranh Tổng Thể (Vòng 1)
   */
  getRound1PictureGuessPoints(): number {
    if (this.r1AnsweredCount <= 2) return 30; // Trước khi mở ô thứ 3
    if (this.r1AnsweredCount <= 5) return 20; // Trước khi mở ô thứ 6
    if (this.r1AnsweredCount <= 8) return 10; // Trước khi mở ô thứ 9
    return 10;
  }
}

export const gameshow = new GameshowEngine();
