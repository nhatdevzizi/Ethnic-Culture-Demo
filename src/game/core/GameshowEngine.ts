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
  isEliminatedInRound2Vertical?: boolean;
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

  // Vòng 1: Trạng thái 9 ô & trạng thái đã lộ từ khóa bức tranh tổng thể
  r1OpenedTiles: boolean[] = Array(9).fill(false);
  r1AnsweredCount = 0;
  r1SecretRevealed = false;

  // Vòng 2: Trạng thái 7 Hàng Ngang Ô Chữ & Từ khóa Hàng Dọc
  r2OpenedRows: boolean[] = Array(7).fill(false);
  r2AnsweredCount = 0;
  r2VerticalRevealed = false;

  // Lịch sử biến động điểm gần nhất để kích hoạt hiệu ứng 4-5s
  lastScoreDeltas: ScoreDeltaEvent[] = [];

  // Quản lý 4 Chìa Khóa mở phong ấn Trống Đồng Đông Sơn
  completedStations: Set<string> = new Set();

  private static readonly KEY_STATIONS = ['M01', 'M02', 'M03', 'M04'] as const;

  // 4 Cung phần tư của Trống Đồng Đông Sơn tương ứng 4 Minigame
  static readonly QUADRANTS = [
    { stationId: 'M01', index: 1, name: 'Cung I', stationName: 'Lán 1: Mảnh Ghép Thổ Cẩm', position: 'top-right' },
    { stationId: 'M02', index: 2, name: 'Cung II', stationName: 'Lán 2: Phiên Chợ Vùng Cao', position: 'bottom-right' },
    { stationId: 'M03', index: 3, name: 'Cung III', stationName: 'Lán 3: Tiếng Vang Cồng Chiêng', position: 'bottom-left' },
    { stationId: 'M04', index: 4, name: 'Cung IV', stationName: 'Lán 4: Lửa Thiêng Đại Ngàn', position: 'top-left' },
  ] as const;

  isQuadrantLit(quadrantIndex: 1 | 2 | 3 | 4): boolean {
    const q = GameshowEngine.QUADRANTS.find((item) => item.index === quadrantIndex);
    return q ? this.isStationCompleted(q.stationId) : false;
  }

  getStationQuadrant(stationId: string): { index: number; name: string; stationName: string; position: string } | null {
    const q = GameshowEngine.QUADRANTS.find((item) => item.stationId === stationId);
    return q ? { index: q.index, name: q.name, stationName: q.stationName, position: q.position } : null;
  }

  markStationCompleted(stationId: string): boolean {
    const isNew = !this.completedStations.has(stationId);
    this.completedStations.add(stationId);
    return isNew;
  }

  getCollectedKeysCount(): number {
    return GameshowEngine.KEY_STATIONS.filter((id) => this.completedStations.has(id)).length;
  }

  isStationCompleted(stationId: string): boolean {
    return this.completedStations.has(stationId);
  }

  hasAllKeys(): boolean {
    return this.getCollectedKeysCount() >= 4;
  }

  // Quản lý thẻ chức năng ngẫu nhiên và ẩn danh giữa các câu hỏi
  private stationCardMap: Map<string, Map<number, FunctionalCardType>> = new Map();
  private claimedCardQuestions: Set<string> = new Set();

  initRandomizedStationCards() {
    this.stationCardMap.clear();
    this.claimedCardQuestions.clear();

    const stationsConfig: Record<string, { totalQuestions: number; cardCount: number }> = {
      M01: { totalQuestions: 9, cardCount: 2 }, // 2 thẻ ngẫu nhiên trên 9 câu
      M02: { totalQuestions: 7, cardCount: 2 }, // 2 thẻ ngẫu nhiên trên 7 hàng
      M03: { totalQuestions: 4, cardCount: 1 }, // 1 thẻ ngẫu nhiên trên 4 câu
      M04: { totalQuestions: 5, cardCount: 2 }, // 2 thẻ ngẫu nhiên trên 5 câu
    };

    const cardTypes: FunctionalCardType[] = ['steal_points', 'block_turn', 'shield'];

    for (const [stationId, cfg] of Object.entries(stationsConfig)) {
      const qMap = new Map<number, FunctionalCardType>();
      const indices = Array.from({ length: cfg.totalQuestions }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      const selectedIndices = indices.slice(0, cfg.cardCount);
      const shuffledTypes = [...cardTypes].sort(() => Math.random() - 0.5);

      selectedIndices.forEach((qIdx, i) => {
        const card = shuffledTypes[i % shuffledTypes.length];
        qMap.set(qIdx, card);
      });

      this.stationCardMap.set(stationId, qMap);
    }
  }

  getQuestionCard(stationId: string, questionIndex: number): FunctionalCardType | null {
    const qKey = `${stationId}:${questionIndex}`;
    if (this.claimedCardQuestions.has(qKey)) return null;
    return this.stationCardMap.get(stationId)?.get(questionIndex) ?? null;
  }

  claimQuestionCard(stationId: string, questionIndex: number): FunctionalCardType | null {
    const card = this.getQuestionCard(stationId, questionIndex);
    if (card) {
      this.claimedCardQuestions.add(`${stationId}:${questionIndex}`);
    }
    return card;
  }

  constructor(teamNames?: string[]) {
    this.initTeams(teamNames);
    this.initRandomizedStationCards();
  }

  initTeams(names?: string[]) {
    const defaultColors = ['#c0503f', '#cf8a2a', '#5f8a45', '#3f6d9e', '#8e44ad'];
    const defaultNames = ['Nhóm 1', 'Nhóm 2', 'Nhóm 3', 'Nhóm 5', 'Nhóm 6'];

    const chosenNames = names && names.length >= 2 ? names : defaultNames;

    this.teams = chosenNames.map((name, idx) => {
      const numMatch = name.match(/\d+/);
      const id = numMatch ? `team_${numMatch[0]}` : `team_${idx + 1}`;
      return {
        id,
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
        isEliminatedInRound2Vertical: false,
        isBlockedNextQuestion: false,
      };
    });
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

  /**
   * Tính điểm dự đoán Từ Khóa Hàng Dọc (Vòng 2 Ô Chữ)
   */
  getRound2VerticalGuessPoints(): number {
    if (this.r2AnsweredCount <= 2) return 40;
    if (this.r2AnsweredCount <= 4) return 30;
    return 20;
  }
}

export const gameshow = new GameshowEngine();
