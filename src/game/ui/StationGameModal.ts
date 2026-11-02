/**
 * Station Game Modal for "Thanh Âm Đại Ngàn"
 * Directly opens when player approaches any of the 4 stations (Lán trại) in the Hub,
 * or the central board for the Grand Finale.
 */

import { gameshow } from '../core/GameshowEngine';
import type { FunctionalCardType } from '../core/GameshowEngine';
import { sfx } from '../systems/SoundEffects';

import r1Data from '../../content/round1_thocam.json';
import r2Data from '../../content/round2_phiencho.json';
import r3Data from '../../content/round3_tiengvang.json';
import r4Data from '../../content/round4_luathieng.json';
import finaleData from '../../content/grand_finale.json';
import '../../styles/gameshow.css';

function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class StationGameModal {
  private static instance: StationGameModal | null = null;
  private modalContainer: HTMLElement;
  private activeStationId: 'M01' | 'M02' | 'M03' | 'M04' | 'board' = 'M01';
  private selectedTeamIndex = 0; // Nhóm đang được chọn để trả lời
  private currentQuestionIndex = 0;

  // Round 1 State: Ban đầu chưa hiển thị câu hỏi cho tới khi người chơi bấm chọn ô
  private r1ActiveTileQuestion = false;
  private isGuessingSecretPainting = false;
  private lastSubmitTime = 0;

  // Round 2 State (Crossword: Hàng Ngang & Hàng Dọc)
  private r2ActiveRowQuestion = false;
  private isGuessingVerticalKeyword = false;

  // Rounds 3-4 & Finale State: Ban đầu ẩn câu hỏi để chọn đuốc / chuẩn bị, bấm nút mới mở câu hỏi
  private isQuestionRevealed = false;
  private isGrandFinaleCelebration = false;

  // Round 4 Torches
  private r4Torches: Record<string, 'silver' | 'gold' | null> = {};

  // Danh sách các đội đã trả lời sai và mất lượt ở câu hỏi hiện tại (Reset khi sang câu mới)
  private failedTeamIdsOnQuestion: Set<string> = new Set();
  private questionWrongAttemptCount = 0;

  // Interactive Multi-Part Question States (True/False, Ordering, Matching)
  private lastInteractiveKey = '';
  private tfSelections: Record<number, boolean | undefined> = {};
  private orderingCurrent: number[] = [];
  private orderingSwapIdx: number | null = null;
  private matchingSelectedLeft: number | null = null;
  private matchingPairs: Record<number, number> = {};
  private interactiveWarningMsg: string | null = null;

  // Question Lock & Toast State
  private questionTimerInterval: number | null = null;
  private isQuestionAnswered = false;
  private toastTimeout: number | null = null;

  // Functional Card inline picker
  private activeStrategyNotice: string | null = null;
  private cardTargetPicker: { type: 'steal' | 'block'; userTeamId: string } | null = null;

  private onCloseCallback?: () => void;
  private onFinishGameCallback?: () => void;

  private constructor() {
    let container = document.getElementById('station-game-modal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'station-game-modal';
      document.body.appendChild(container);
    }
    this.modalContainer = container;
  }

  static get(): StationGameModal {
    if (!StationGameModal.instance) {
      StationGameModal.instance = new StationGameModal();
    }
    return StationGameModal.instance;
  }

  get isOpen(): boolean {
    return this.modalContainer.style.display === 'flex';
  }

  open(
    stationId: 'M01' | 'M02' | 'M03' | 'M04' | 'board',
    onClose?: () => void,
    onFinishGame?: () => void
  ) {
    this.clearAllTimers();
    this.activeStationId = stationId;
    this.isGuessingSecretPainting = false;
    this.r1ActiveTileQuestion = false;
    this.r2ActiveRowQuestion = false;
    this.isGuessingVerticalKeyword = false;
    this.isQuestionRevealed = false;
    this.isQuestionAnswered = false;
    this.isGrandFinaleCelebration = stationId === 'board' && gameshow.isStationCompleted('board');
    this.cardTargetPicker = null;
    this.activeStrategyNotice = null;
    this.currentQuestionIndex = 0;
    this.resetCurrentQuestionAttemptState();
    this.onCloseCallback = onClose;
    this.onFinishGameCallback = onFinishGame;

    this.modalContainer.style.display = 'flex';
    sfx.playGong();
    this.stopQuestionTimer();
    this.render();
  }

  close() {
    this.clearAllTimers();
    this.modalContainer.style.display = 'none';
    this.modalContainer.innerHTML = '';
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  private clearAllTimers() {
    this.stopQuestionTimer();
    this.clearActiveToast();
  }

  private clearActiveToast() {
    if (this.toastTimeout !== null) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }
    const existing = this.modalContainer.querySelector('.gs-score-toast');
    if (existing) existing.remove();
  }

  /**
   * Reset hoàn toàn trạng thái các đội đã trả lời sai và lựa chọn tương tác khi chuyển sang câu hỏi mới
   */
  private resetCurrentQuestionAttemptState() {
    this.failedTeamIdsOnQuestion.clear();
    this.questionWrongAttemptCount = 0;
    this.isQuestionAnswered = false;
    this.resetInteractiveState();
    this.ensureValidSelectedTeam();
  }

  /**
   * Đảm bảo đội đang được chọn không nằm trong danh sách đã mất lượt hoặc bị cấm lượt
   */
  private ensureValidSelectedTeam() {
    const current = gameshow.teams[this.selectedTeamIndex];
    if (
      !current ||
      this.failedTeamIdsOnQuestion.has(current.id) ||
      current.isBlockedNextQuestion
    ) {
      const nextIdx = gameshow.teams.findIndex(
        (t) => !this.failedTeamIdsOnQuestion.has(t.id) && !t.isBlockedNextQuestion
      );
      if (nextIdx !== -1) {
        this.selectedTeamIndex = nextIdx;
      }
    }
  }

  private resetInteractiveState() {
    this.lastInteractiveKey = '';
    this.tfSelections = {};
    this.orderingCurrent = [];
    this.orderingSwapIdx = null;
    this.matchingSelectedLeft = 0;
    this.matchingPairs = {};
    this.interactiveWarningMsg = null;
  }

  private resetInteractiveSelectionsOnly(q: {
    initial_order?: number[];
    items?: string[];
  }) {
    this.tfSelections = {};
    if (q.initial_order && q.initial_order.length) {
      this.orderingCurrent = [...q.initial_order];
    } else if (q.items && q.items.length) {
      this.orderingCurrent = q.items.map((_, i) => i);
    } else {
      this.orderingCurrent = [];
    }
    this.orderingSwapIdx = null;
    this.matchingSelectedLeft = 0;
    this.matchingPairs = {};
    this.interactiveWarningMsg = null;
  }

  private ensureInteractiveQuestionState(q: {
    type?: string;
    initial_order?: number[];
    items?: string[];
  }) {
    const key = `${this.activeStationId}_${this.currentQuestionIndex}`;
    if (this.lastInteractiveKey !== key) {
      this.lastInteractiveKey = key;
      this.resetInteractiveSelectionsOnly(q);
    }
  }

  private startQuestionTimer(_limitSeconds?: number) {
    this.stopQuestionTimer();
    this.isQuestionAnswered = false;
    // MC chủ động đếm thời gian và chọn đội trả lời
  }

  private stopQuestionTimer() {
    if (this.questionTimerInterval !== null) {
      clearInterval(this.questionTimerInterval);
      this.questionTimerInterval = null;
    }
  }

  render() {
    this.modalContainer.innerHTML = '';
    this.ensureValidSelectedTeam();

    const dialog = document.createElement('div');
    dialog.className = `gs-station-dialog gs-theme-${this.activeStationId}`;

    // 1. Team Selector Bar (Chọn Nhóm trả lời, dùng thẻ & Nút Về Bản Đồ)
    if (!this.isGrandFinaleCelebration) {
      const teamSelectorBar = this.createTeamSelectorBar();
      dialog.appendChild(teamSelectorBar);
    }

    // 3. Station Body
    const contentBody = document.createElement('div');
    contentBody.className = 'gs-station-body';

    if (this.activeStationId === 'M01') {
      contentBody.appendChild(this.renderRound1());
    } else if (this.activeStationId === 'M02') {
      contentBody.appendChild(this.renderRound2());
    } else if (this.activeStationId === 'M03') {
      contentBody.appendChild(this.renderRound3());
    } else if (this.activeStationId === 'M04') {
      contentBody.appendChild(this.renderRound4());
    } else if (this.activeStationId === 'board') {
      contentBody.appendChild(this.renderGrandFinale());
    }

    dialog.appendChild(contentBody);
    this.modalContainer.appendChild(dialog);
  }

  // ==========================================================================
  // TEAM SELECTOR BAR (Click chọn Nhóm trả lời câu hỏi, hiển thị mất lượt & dùng thẻ)
  // ==========================================================================
  private createTeamSelectorBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'gs-team-selector-bar';

    const label = document.createElement('div');
    label.className = 'gs-selector-label';
    label.innerHTML = `CHỌN NHÓM TRẢ LỜI:`;
    bar.appendChild(label);

    const row = document.createElement('div');
    row.className = 'gs-selector-row';

    gameshow.teams.forEach((team, idx) => {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = '4px';

      const btn = document.createElement('button');
      const isSelected = idx === this.selectedTeamIndex;
      const isBlocked = Boolean(team.isBlockedNextQuestion);
      const hasFailedThisQuestion = this.failedTeamIdsOnQuestion.has(team.id);

      btn.className = `gs-selector-team-btn ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''} ${hasFailedThisQuestion ? 'failed-turn' : ''}`;
      btn.style.borderColor = team.color;

      let statusBadge = '';
      if (isBlocked) {
        statusBadge = ' <span class="gs-team-turn-badge blocked-badge">🔒 CẤM LƯỢT</span>';
      } else if (hasFailedThisQuestion) {
        statusBadge = ' <span class="gs-team-turn-badge failed-badge">❌ ĐÃ SAI (MẤT LƯỢT)</span>';
      }

      btn.innerHTML = `
        <span class="gs-st-name"><i class="gs-st-dot ${isSelected ? 'on' : ''}"></i> ${team.name}${statusBadge}</span>
        <span class="gs-st-score">${team.score}đ</span>
        <span class="gs-st-cards">⚡${team.cards.steal_points} 🔒${team.cards.block_turn} 🛡️${team.cards.shield}</span>
      `;

      btn.addEventListener('click', () => {
        if (isBlocked) {
          sfx.playFailure();
          this.showScoreToast(
            team.name,
            0,
            `🔒 ${team.name} đang bị CẤM LƯỢT ở câu hỏi này! Không thể chọn để trả lời.`,
            2200
          );
          return;
        }
        if (hasFailedThisQuestion) {
          sfx.playFailure();
          this.showScoreToast(
            team.name,
            0,
            `❌ ${team.name} đã trả lời sai và mất lượt ở câu hỏi này! Hãy chọn đội khác còn lượt trả lời.`,
            2200
          );
          return;
        }
        this.selectedTeamIndex = idx;
        sfx.playBuzzer();
        this.render();
      });

      wrap.appendChild(btn);

      // Quick card buttons if team has Steal or Block cards
      if (team.cards.steal_points > 0 || team.cards.block_turn > 0) {
        const cardActions = document.createElement('div');
        cardActions.style.display = 'flex';
        cardActions.style.gap = '4px';

        if (team.cards.steal_points > 0) {
          const stealBtn = document.createElement('button');
          stealBtn.className = 'gs-card-act-btn steal';
          stealBtn.textContent = `⚡ Cướp Điểm (${team.cards.steal_points})`;
          stealBtn.addEventListener('click', () => {
            this.cardTargetPicker = { type: 'steal', userTeamId: team.id };
            this.render();
          });
          cardActions.appendChild(stealBtn);
        }

        if (team.cards.block_turn > 0) {
          const blockBtn = document.createElement('button');
          blockBtn.className = 'gs-card-act-btn block';
          blockBtn.textContent = `🔒 Cấm Lượt (${team.cards.block_turn})`;
          blockBtn.addEventListener('click', () => {
            this.cardTargetPicker = { type: 'block', userTeamId: team.id };
            this.render();
          });
          cardActions.appendChild(blockBtn);
        }

        wrap.appendChild(cardActions);
      }

      // Inline Target Picker for Steal or Block
      if (this.cardTargetPicker && this.cardTargetPicker.userTeamId === team.id) {
        const pickerBox = document.createElement('div');
        pickerBox.className = 'gs-5s-target-picker';

        const pickerTitle = document.createElement('div');
        pickerTitle.className = 'gs-5s-target-title';
        pickerTitle.textContent = this.cardTargetPicker.type === 'steal'
          ? '🎯 Chọn nhóm để rút 20đ:'
          : '🎯 Chọn nhóm để cấm lượt:';
        pickerBox.appendChild(pickerTitle);

        const btnsRow = document.createElement('div');
        btnsRow.className = 'gs-5s-target-btns';

        const targets = gameshow.teams.filter((t) => t.id !== team.id);
        targets.forEach((tgt) => {
          const tgtBtn = document.createElement('button');
          tgtBtn.className = 'gs-5s-target-btn';
          tgtBtn.textContent = this.cardTargetPicker?.type === 'steal'
            ? `${tgt.name} (${tgt.score}đ)`
            : tgt.name;
          tgtBtn.addEventListener('click', () => {
            if (this.cardTargetPicker?.type === 'steal') {
              const res = gameshow.useStealPointsCard(team.id, tgt.id);
              sfx.playCardActivate();
              this.activeStrategyNotice = res.shielded ? `🛡️ ${res.message}` : `⚡ ${res.message}`;
            } else if (this.cardTargetPicker?.type === 'block') {
              const res = gameshow.useBlockTurnCard(team.id, tgt.id);
              sfx.playCardActivate();
              this.activeStrategyNotice = res.shielded ? `🛡️ ${res.message}` : `🔒 ${res.message}`;
            }
            this.cardTargetPicker = null;
            this.render();
          });
          btnsRow.appendChild(tgtBtn);
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'gs-5s-target-cancel';
        cancelBtn.textContent = '❌ Hủy';
        cancelBtn.addEventListener('click', () => {
          this.cardTargetPicker = null;
          this.render();
        });
        btnsRow.appendChild(cancelBtn);

        pickerBox.appendChild(btnsRow);
        wrap.appendChild(pickerBox);
      }

      row.appendChild(wrap);
    });

    // Nút [← VỀ BẢN ĐỒ] đặt cạnh sau nút chọn nhóm 6
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'gs-btn-back-hub';
    backBtn.innerHTML = '← VỀ BẢN ĐỒ';
    backBtn.title = 'Quay về bản đồ lễ hội';
    backBtn.addEventListener('click', () => this.close());
    row.appendChild(backBtn);

    bar.appendChild(row);
    return bar;
  }

  // ==========================================================================
  // ROUND 1: MẢNH GHÉP THỔ CẨM (Phần 1: Khái niệm & Đặc trưng cơ bản của Dân tộc)
  // ==========================================================================
  private renderRound1(): HTMLElement {
    // Khi người chơi bấm vào 1 mảnh ghép -> Tạm ẩn bảng 9 mảnh ghép, mở toàn màn hình câu hỏi của mảnh đó!
    if (this.r1ActiveTileQuestion && !this.isGuessingSecretPainting) {
      const fullWrap = document.createElement('div');
      fullWrap.className = 'gs-r1-fullscreen-question-wrap';

      const q = r1Data.questions[this.currentQuestionIndex];
      const qTypeLabel = this.getQuestionFormatLabel((q as { type?: string }).type);
      const qCard = this.renderQuestionByFormat(
        q,
        `MẢNH GHÉP SỐ ${this.currentQuestionIndex + 1} / 9 · ${qTypeLabel} (+20 / -10 ĐIỂM)`,
        (isCorrect) => {
          const currentTeam = gameshow.teams[this.selectedTeamIndex];
          if (isCorrect) {
            if (!gameshow.r1OpenedTiles[this.currentQuestionIndex]) {
              gameshow.r1OpenedTiles[this.currentQuestionIndex] = true;
              gameshow.r1AnsweredCount++;
            }
            gameshow.modifyScore(currentTeam.id, +20, 'Trả lời đúng mảnh ghép Vòng 1');
          } else {
            gameshow.modifyScore(currentTeam.id, -10, 'Trả lời sai mảnh ghép Vòng 1');
          }
        }
      );

      fullWrap.appendChild(qCard);
      return fullWrap;
    }

    const container = document.createElement('div');
    container.className = 'gs-r1-layout';

    // Left: Mosaic Box (3x3 grid)
    const leftCol = document.createElement('div');
    const mosaicBox = document.createElement('div');
    mosaicBox.className = 'gs-mosaic-container';

    const secretImg = document.createElement('img');
    secretImg.className = 'gs-secret-img';
    secretImg.src = r1Data.secret_image;
    secretImg.alt = 'Bức tranh bí ẩn Vòng 1';
    mosaicBox.appendChild(secretImg);

    const grid = document.createElement('div');
    grid.className = 'gs-mosaic-grid';

    for (let i = 0; i < 9; i++) {
      const tile = document.createElement('div');
      const isOpened = gameshow.r1OpenedTiles[i];
      tile.className = `gs-mosaic-tile ${isOpened ? 'opened' : ''}`;

      const num = document.createElement('div');
      num.className = 'gs-tile-number';
      num.textContent = String(i + 1);
      tile.appendChild(num);

      // Đã ẩn toàn bộ huy hiệu gợi ý thẻ chức năng để đảm bảo tính bất ngờ ngẫu nhiên

      tile.addEventListener('click', () => {
        if (!isOpened) {
          this.clearActiveToast();
          this.isGuessingSecretPainting = false;
          this.currentQuestionIndex = i;
          this.r1ActiveTileQuestion = true;
          this.resetCurrentQuestionAttemptState();
          sfx.playBuzzer();
          this.startQuestionTimer();
          this.render();
        }
      });

      grid.appendChild(tile);
    }
    mosaicBox.appendChild(grid);
    leftCol.appendChild(mosaicBox);

    // Guess painting button
    const guessPoints = gameshow.getRound1PictureGuessPoints();
    const guessBtn = document.createElement('button');
    guessBtn.className = 'gs-guess-painting-btn';
    guessBtn.textContent = `🔔 ĐOÁN BỨC TRANH TỔNG THỂ (+${guessPoints} ĐIỂM)`;
    guessBtn.addEventListener('click', () => {
      this.clearActiveToast();
      this.stopQuestionTimer();
      this.isGuessingSecretPainting = true;
      this.r1ActiveTileQuestion = false;
      this.isQuestionAnswered = false;
      sfx.playBuzzer();
      this.render();
    });
    leftCol.appendChild(guessBtn);

    // Complete round 1 button
    const isCompleted = gameshow.isStationCompleted('M01');
    const completeBtn = document.createElement('button');
    completeBtn.className = `gs-round-complete-btn ${isCompleted ? 'done' : ''}`;
    completeBtn.textContent = isCompleted
      ? '✅ ĐÃ HOÀN THÀNH VÒNG 1 (ĐÃ CÓ CHÌA KHÓA 1)'
      : '🏁 HOÀN THÀNH VÒNG 1 (NHẬN CHÌA KHÓA 1 🗝️)';
    completeBtn.addEventListener('click', () => {
      this.finishCurrentStation('M01', 'Vòng 1: Mảnh Ghép Thổ Cẩm');
    });
    leftCol.appendChild(completeBtn);

    container.appendChild(leftCol);

    // Right: Secret Painting Guess Form OR Prompt Panel
    const allTeamsEliminated = gameshow.teams.every((t) => Boolean(t.isEliminatedInRound1));
    if (allTeamsEliminated) {
      gameshow.r1SecretRevealed = true;
    }

    let rightCol: HTMLElement;

    if (this.isGuessingSecretPainting && !gameshow.r1SecretRevealed) {
      rightCol = this.renderGuessSecretPaintingCard();
    } else if (gameshow.r1SecretRevealed) {
      rightCol = document.createElement('div');
      rightCol.className = 'gs-question-panel gs-r1-prompt-panel';
      const headerStatus = allTeamsEliminated
        ? '📢 TẤT CẢ CÁC NHÓM ĐỀU ĐÃ ĐOÁN SAI · LỘ DIỆN TỪ KHÓA BỨC TRANH!'
        : '🎉 ĐÃ GIẢI MÃ THÀNH CÔNG BỨC TRANH TỔNG THỂ!';
      rightCol.innerHTML = `
        <div class="gs-q-theme">${headerStatus}</div>
        <div class="gs-q-text" style="text-align:center; padding: 20px 15px;">
          <p style="font-size: 26px; color: var(--gs-gold); font-weight:800; margin-bottom: 12px;">
            🔑 Từ khóa bức tranh: ${r1Data.secret_title}
          </p>
          <p style="font-size: 18px; color: var(--gs-text-sub); line-height: 1.6;">
            ${r1Data.secret_description}
          </p>
        </div>
      `;
    } else {
      const allOpened = gameshow.r1OpenedTiles.every(Boolean);

      if (allOpened) {
        rightCol = document.createElement('div');
        rightCol.className = 'gs-question-panel gs-r1-prompt-panel';
        rightCol.innerHTML = `
          <div class="gs-q-theme">🖼️ ĐÃ LẬT MỞ TOÀN BỘ 9 MẢNH GHÉP! (TỪ KHÓA ĐANG ẨN)</div>
          <div class="gs-q-text" style="text-align:center; padding: 22px 15px;">
            <p style="font-size: 22px; color: var(--gs-gold); font-weight:800; margin-bottom: 12px;">
              Bức tranh đã lộ diện hoàn toàn! Nhưng từ khóa vẫn đang được giữ kín.
            </p>
            <p style="font-size: 17px; color: var(--gs-text-sub); line-height: 1.65;">
              👉 Hãy bấm nút <strong>"🔔 ĐOÁN BỨC TRANH TỔNG THỂ"</strong> bên trái để các đội nhập đáp án.<br>
              • Từ khóa đáp án sẽ chỉ hiển thị sau khi <strong>có 1 đội đoán đúng</strong> hoặc <strong>tất cả các nhóm đều đoán sai</strong>!
            </p>
          </div>
        `;
      } else {
        const openedCount = gameshow.r1OpenedTiles.filter(Boolean).length;
        rightCol = document.createElement('div');
        rightCol.className = 'gs-question-panel gs-r1-prompt-panel';
        rightCol.innerHTML = `
          <div class="gs-q-theme">🎯 ĐÃ MỞ ${openedCount} / 9 MẢNH GHÉP · MỜI CHỌN MẢNH GHÉP TIẾP THEO</div>
          <div class="gs-q-text" style="text-align:center; padding: 25px 15px;">
            <p style="font-size: 24px; color: var(--gs-gold); font-weight:800; margin-bottom: 14px;">
              👉 BẤM VÀO MỘT Ô SỐ (1 – 9) BÊN TRÁI ĐỂ MỞ CÂU HỎI!
            </p>
            <p style="font-size: 18px; color: var(--gs-text-sub); line-height: 1.7;">
              • Khi bấm vào 1 mảnh, bảng mảnh ghép sẽ tạm ẩn đi để hiển thị câu hỏi toàn màn hình.<br>
              • Sau khi tìm ra đáp án (có nhóm trả lời đúng hoặc tất cả các nhóm đều sai), bấm nút <strong>"🔙 QUAY VỀ BẢNG MẢNH GHÉP"</strong> và mảnh vừa trả lời sẽ mở khóa hình ảnh!
            </p>
          </div>
        `;
      }
    }

    container.appendChild(rightCol);
    return container;
  }

  // ==========================================================================
  // ROUND 1 SECRET PAINTING FILL-IN GUESS CARD
  // ==========================================================================
  /**
   * Giới hạn tần suất click nút submit đáp án (Tối đa 1 lần / 1 giây để chống spam click)
   */
  private attachThrottledSubmit(
    submitBtn: HTMLButtonElement,
    handler: () => void,
    inputEl?: HTMLInputElement,
    cooldownMs = 1000
  ) {
    const throttledHandler = () => {
      const now = Date.now();
      if (now - this.lastSubmitTime < cooldownMs) {
        return;
      }
      this.lastSubmitTime = now;

      // Khóa nút tức thì để ngăn spam click
      submitBtn.disabled = true;
      submitBtn.style.pointerEvents = 'none';
      submitBtn.style.opacity = '0.6';

      handler();

      window.setTimeout(() => {
        if (!this.isQuestionAnswered) {
          submitBtn.disabled = false;
          submitBtn.style.pointerEvents = '';
          submitBtn.style.opacity = '';
        }
      }, cooldownMs);
    };

    submitBtn.addEventListener('click', throttledHandler);
    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          throttledHandler();
        }
      });
    }
  }

  private renderGuessSecretPaintingCard(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    if (gameshow.teams[this.selectedTeamIndex]?.isEliminatedInRound1) {
      const availableIdx = gameshow.teams.findIndex((t) => !t.isEliminatedInRound1);
      if (availableIdx !== -1) {
        this.selectedTeamIndex = availableIdx;
      }
    }

    const points = gameshow.getRound1PictureGuessPoints();
    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = `🔔 ĐOÁN BỨC TRANH TỔNG THỂ (+${points} ĐIỂM NẾU ĐÚNG)`;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = 'Chọn Đội đang trả lời và nhập từ khóa ngắn gọn của Bức tranh bí ẩn vào ô bên dưới (Đội đoán sai sẽ mất lượt đoán bức tranh và chuyển quyền cho đội khác):';
    panel.appendChild(text);

    const teamTickBox = document.createElement('div');
    teamTickBox.className = 'gs-guess-team-tick-box';

    const tickLabel = document.createElement('div');
    tickLabel.className = 'gs-guess-team-tick-label';
    tickLabel.textContent = '1. CHỌN NHÓM ĐANG ĐOÁN BỨC TRANH:';
    teamTickBox.appendChild(tickLabel);

    const tickGrid = document.createElement('div');
    tickGrid.className = 'gs-guess-team-tick-grid';

    gameshow.teams.forEach((team, idx) => {
      const isSelected = idx === this.selectedTeamIndex;
      const isEliminated = Boolean(team.isEliminatedInRound1);
      const tickBtn = document.createElement('button');
      tickBtn.type = 'button';
      tickBtn.className = `gs-guess-team-tick-btn ${isSelected ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`;
      tickBtn.style.borderColor = isSelected ? 'var(--gs-gold)' : team.color;
      tickBtn.disabled = isEliminated || this.isQuestionAnswered;
      tickBtn.innerHTML = `
        <span class="gs-tick-icon">${isSelected ? '☑️' : '⬜'}</span>
        <span>${team.name}${isEliminated ? ' (❌ Đã đoán sai)' : ''}</span>
      `;
      tickBtn.addEventListener('click', () => {
        if (isEliminated || this.isQuestionAnswered) return;
        this.selectedTeamIndex = idx;
        sfx.playBuzzer();
        this.render();
      });
      tickGrid.appendChild(tickBtn);
    });

    teamTickBox.appendChild(tickGrid);
    panel.appendChild(teamTickBox);

    const inputRow = document.createElement('div');
    inputRow.className = 'gs-fillin-row';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'gs-fillin-input';
    input.placeholder = `Nhập từ khóa ngắn gọn cho [${currentTeam.name}] tại đây...`;
    input.disabled = this.isQuestionAnswered;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ KIỂM TRA ĐÁP ÁN';
    submitBtn.disabled = this.isQuestionAnswered;

    const checkPaintingGuess = () => {
      if (this.isQuestionAnswered) return;
      const rawValue = input.value.trim();
      if (!rawValue) {
        input.focus();
        return;
      }

      const answeringTeam = gameshow.teams[this.selectedTeamIndex];
      if (answeringTeam.isEliminatedInRound1) {
        this.showScoreToast(
          answeringTeam.name,
          0,
          `⚠️ ${answeringTeam.name} đã đoán sai trước đó và mất quyền đoán Bức tranh tổng thể ở Vòng 1. Hãy chọn đội khác!`,
          2500
        );
        return;
      }

      this.isQuestionAnswered = true;
      input.disabled = true;
      submitBtn.disabled = true;

      const normTyped = normalizeVietnamese(rawValue);
      const isCorrect = normTyped.includes('cong chieng');

      if (isCorrect) {
        input.classList.add('correct');
        gameshow.modifyScore(answeringTeam.id, points, 'Đoán đúng Bức tranh tổng thể');
        gameshow.r1OpenedTiles.fill(true);
        gameshow.r1SecretRevealed = true;
        gameshow.markStationCompleted('M01');
        sfx.playSuccess();
        sfx.playGong();

        const totalKeysAfterR1 = gameshow.getCollectedKeysCount();
        this.showScoreToast(
          answeringTeam.name,
          points,
          `🎉 CHÍNH XÁC! Từ khóa bức tranh là: "${r1Data.secret_title}".\n${answeringTeam.name} giành trọn +${points} điểm và mở khóa Chìa Khóa Vòng 1 (${totalKeysAfterR1}/4)!`,
          4000,
          () => {
            this.isGuessingSecretPainting = false;
            this.r1ActiveTileQuestion = false;
            this.render();
            if (totalKeysAfterR1 >= 4) {
              this.showDrumUnsealedCelebrationToast();
            }
          }
        );
      } else {
        input.classList.add('incorrect');
        answeringTeam.isEliminatedInRound1 = true;
        sfx.playFailure();

        const allEliminatedNow = gameshow.teams.every((t) => Boolean(t.isEliminatedInRound1));
        if (allEliminatedNow) {
          gameshow.r1OpenedTiles.fill(true);
          gameshow.r1SecretRevealed = true;
          this.showScoreToast(
            'TẤT CẢ CÁC NHÓM ĐỀU ĐÃ ĐOÁN SAI',
            0,
            `❌ Đáp án "${rawValue}" chưa chính xác!\nTất cả các nhóm đều đã hết lượt đoán. Từ khóa chính xác của bức tranh là: "${r1Data.secret_title}"!`,
            4500,
            () => {
              this.isGuessingSecretPainting = false;
              this.r1ActiveTileQuestion = false;
              this.render();
            }
          );
        } else {
          const remainingTeams = gameshow.teams.filter((t) => !t.isEliminatedInRound1);
          this.showScoreToast(
            answeringTeam.name,
            0,
            `❌ Đáp án "${rawValue}" chưa chính xác!\n${answeringTeam.name} đã mất quyền đoán Bức tranh tổng thể (Chuyển quyền cho: ${remainingTeams.map((t) => t.name).join(', ')} — từ khóa vẫn đang giữ kín).`,
            3500,
            () => {
              this.isQuestionAnswered = false;
              const nextAvailableIdx = gameshow.teams.findIndex((t) => !t.isEliminatedInRound1);
              if (nextAvailableIdx !== -1) {
                this.selectedTeamIndex = nextAvailableIdx;
              }
              this.render();
            }
          );
        }
      }
    };

    this.attachThrottledSubmit(submitBtn, checkPaintingGuess, input);

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);
    panel.appendChild(inputRow);

    const cancelRow = document.createElement('div');
    cancelRow.style.marginTop = '12px';
    cancelRow.style.display = 'flex';
    cancelRow.style.justifyContent = 'flex-start';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'gs-nav-btn prev';
    cancelBtn.textContent = '⬅ QUAY LẠI LƯỚI MẢNH GHÉP';
    cancelBtn.addEventListener('click', () => {
      this.isGuessingSecretPainting = false;
      this.r1ActiveTileQuestion = false;
      this.stopQuestionTimer();
      this.render();
    });
    cancelRow.appendChild(cancelBtn);
    panel.appendChild(cancelRow);

    return panel;
  }

  // ==========================================================================
  // ROUND 2: Ô CHỮ ĐẠI NGÀN (ĐOÁN CHỮ HÀNG NGANG & HÀNG DỌC)
  // ==========================================================================
  private renderRound2(): HTMLElement {
    // 1. Khi bấm vào 1 hàng ngang -> Nhảy sang toàn màn hình câu hỏi của hàng đó (giống Minigame 1)
    if (this.r2ActiveRowQuestion && !this.isGuessingVerticalKeyword) {
      const fullWrap = document.createElement('div');
      fullWrap.className = 'gs-r1-fullscreen-question-wrap';

      const rowQ = r2Data.questions[this.currentQuestionIndex];
      const qCard = this.renderCrosswordRowQuestionCard(rowQ, this.currentQuestionIndex);
      fullWrap.appendChild(qCard);
      return fullWrap;
    }

    // 2. Khi bấm vào Đoán Từ Khóa Hàng Dọc -> Nhảy sang màn hình đoán từ khóa toàn màn hình
    if (this.isGuessingVerticalKeyword && !gameshow.r2VerticalRevealed) {
      const fullWrap = document.createElement('div');
      fullWrap.className = 'gs-r1-fullscreen-question-wrap';

      const guessCard = this.renderGuessVerticalKeywordCard();
      fullWrap.appendChild(guessCard);
      return fullWrap;
    }

    // 3. Màn hình Bảng Ô Chữ Đại Ngàn (toàn màn hình, rộng rãi, không bị chèn ký tự)
    const boardPanel = document.createElement('div');
    boardPanel.className = 'gs-cw-board-panel gs-cw-board-fullscreen';

    const boardHeader = document.createElement('div');
    boardHeader.className = 'gs-cw-board-header';
    boardHeader.innerHTML = `
      <div class="gs-cw-board-title">🧩 BẢNG Ô CHỮ: 7 HÀNG NGANG & 1 HÀNG DỌC</div>
      <div class="gs-cw-board-sub">Bấm vào Hàng ngang (1–7) để mở câu hỏi · Cột màu vàng thẳng đứng là <strong>TỪ KHÓA HÀNG DỌC (7 chữ cái)</strong></div>
    `;
    boardPanel.appendChild(boardHeader);

    // Banner hiển thị nếu từ khóa hàng dọc đã được giải mã thành công
    const allTeamsEliminatedV = gameshow.teams.every((t) => Boolean(t.isEliminatedInRound2Vertical));
    if (allTeamsEliminatedV) {
      gameshow.r2VerticalRevealed = true;
    }
    if (gameshow.r2VerticalRevealed) {
      const solvedBanner = document.createElement('div');
      solvedBanner.className = 'gs-cw-solved-explanation';
      solvedBanner.style.margin = '4px 0 10px';
      solvedBanner.innerHTML = `
        <div class="gs-cw-solved-title">
          🌟 TỪ KHÓA HÀNG DỌC: ${r2Data.vertical_keyword}
        </div>
        
      `;
      boardPanel.appendChild(solvedBanner);
    }

    const gridWrap = document.createElement('div');
    gridWrap.className = 'gs-cw-grid-rows';

    // Cột dọc chuẩn căn ở vị trí cột thứ 5 (0-based index = 4) trong lưới 12 cột chữ cái
    const PIVOT_COL = 4;

    r2Data.questions.forEach((rowQ, rowIdx) => {
      const isRowOpened = gameshow.r2OpenedRows[rowIdx] || gameshow.r2VerticalRevealed;
      const isRowSelected = !this.isGuessingVerticalKeyword && this.r2ActiveRowQuestion && this.currentQuestionIndex === rowIdx;

      const rowEl = document.createElement('div');
      rowEl.className = `gs-cw-row ${isRowOpened ? 'opened' : ''} ${isRowSelected ? 'selected' : ''}`;

      const rowBtn = document.createElement('button');
      rowBtn.type = 'button';
      rowBtn.className = 'gs-cw-row-num-btn';
      rowBtn.innerHTML = `Hàng ${rowIdx + 1}`;
      rowEl.appendChild(rowBtn);

      const cellsTrack = document.createElement('div');
      cellsTrack.className = 'gs-cw-cells-track';

      const startGridCol = PIVOT_COL - rowQ.vertical_col_index;

      for (let c = 0; c < 12; c++) {
        const charIdx = c - startGridCol;
        if (charIdx >= 0 && charIdx < rowQ.word_cells.length) {
          const isVerticalCell = charIdx === rowQ.vertical_col_index;
          const cell = document.createElement('div');
          cell.className = `gs-cw-cell letter-cell ${isRowOpened ? 'revealed' : 'hidden'} ${isVerticalCell ? 'vertical-key-cell' : ''}`;
          if (isRowOpened) {
            cell.textContent = rowQ.word_cells[charIdx];
          } else if (gameshow.r2VerticalRevealed && isVerticalCell) {
            cell.textContent = rowQ.vertical_char;
          } else {
            cell.textContent = isVerticalCell ? '★' : '';
          }
          cellsTrack.appendChild(cell);
        } else {
          const emptyCell = document.createElement('div');
          emptyCell.className = 'gs-cw-cell empty-spacer';
          cellsTrack.appendChild(emptyCell);
        }
      }

      rowEl.appendChild(cellsTrack);

      rowEl.addEventListener('click', () => {
        this.clearActiveToast();
        this.isGuessingVerticalKeyword = false;
        this.currentQuestionIndex = rowIdx;
        this.r2ActiveRowQuestion = true;
        this.resetCurrentQuestionAttemptState();
        sfx.playBuzzer();
        this.render();
      });

      gridWrap.appendChild(rowEl);
    });

    boardPanel.appendChild(gridWrap);

    // Bottom Actions: Đoán Từ Khóa Hàng Dọc & Hoàn Thành Vòng 2
    const leftActions = document.createElement('div');
    leftActions.className = 'gs-cw-left-actions';

    const vPoints = gameshow.getRound2VerticalGuessPoints();
    const guessVerticalBtn = document.createElement('button');
    guessVerticalBtn.type = 'button';
    guessVerticalBtn.className = 'gs-guess-painting-btn';
    guessVerticalBtn.textContent = gameshow.r2VerticalRevealed
      ? `🌟 TỪ KHÓA HÀNG DỌC: ${r2Data.vertical_keyword} (ĐÃ MỞ)`
      : `🌟 ĐOÁN TỪ KHÓA HÀNG DỌC (+${vPoints} ĐIỂM)`;
    guessVerticalBtn.addEventListener('click', () => {
      this.clearActiveToast();
      this.isGuessingVerticalKeyword = true;
      this.r2ActiveRowQuestion = false;
      this.isQuestionAnswered = false;
      sfx.playBuzzer();
      this.render();
    });
    leftActions.appendChild(guessVerticalBtn);

    const isCompleted = gameshow.isStationCompleted('M02');
    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = `gs-round-complete-btn ${isCompleted ? 'done' : ''}`;
    completeBtn.textContent = isCompleted
      ? '✅ ĐÃ HOÀN THÀNH VÒNG 2 (ĐÃ CÓ CHÌA KHÓA 2)'
      : '🏁 HOÀN THÀNH VÒNG 2 (NHẬN CHÌA KHÓA 2 🗝️)';
    completeBtn.addEventListener('click', () => {
      this.finishCurrentStation('M02', 'Vòng 2: Ô Chữ Đại Ngàn');
    });
    leftActions.appendChild(completeBtn);

    boardPanel.appendChild(leftActions);
    return boardPanel;
  }

  private renderCrosswordRowQuestionCard(
    q: (typeof r2Data.questions)[number],
    rowIdx: number
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    const isAlreadySolved = gameshow.r2OpenedRows[rowIdx];

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = `HÀNG NGANG SỐ ${rowIdx + 1} (${q.word_cells.length} CHỮ CÁI) · ${q.theme.toUpperCase()} (+20 / -10 ĐIỂM)`;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = q.question;
    panel.appendChild(text);

    // Interactive Letter Slots Preview for this Horizontal Row
    const previewWrap = document.createElement('div');
    previewWrap.className = 'gs-cw-answer-preview';

    const previewSlots: HTMLElement[] = [];
    q.word_cells.forEach((ch, idx) => {
      const slot = document.createElement('div');
      const isVert = idx === q.vertical_col_index;
      slot.className = `gs-cw-preview-slot ${isVert ? 'vert-highlight' : ''} ${isAlreadySolved || this.isQuestionAnswered ? 'revealed' : ''}`;
      slot.textContent = isAlreadySolved || this.isQuestionAnswered ? ch : (isVert ? '★' : '');
      previewSlots.push(slot);
      previewWrap.appendChild(slot);
    });
    panel.appendChild(previewWrap);

    if (isAlreadySolved) {
      const solvedBox = document.createElement('div');
      solvedBox.className = 'gs-cw-solved-explanation';
      solvedBox.innerHTML = `
        <div class="gs-cw-solved-title">
          ✅ ĐÁP ÁN HÀNG NGANG ${rowIdx + 1}: ${q.word_display} (Chữ cái Hàng Dọc: "${q.vertical_char}")
        </div>
        
      `;
      panel.appendChild(solvedBox);
      return panel;
    }

    const inputRow = document.createElement('div');
    inputRow.className = 'gs-fillin-row';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'gs-fillin-input';
    input.placeholder = `Nhập đáp án Hàng ngang ${rowIdx + 1} (${q.word_cells.length} chữ cái) cho [${currentTeam.name}]...`;
    input.disabled = this.isQuestionAnswered;

    // Live populate letters into preview slots as user types (ignoring spaces)
    input.addEventListener('input', () => {
      const compact = input.value.replace(/\s+/g, '').toUpperCase();
      previewSlots.forEach((slot, idx) => {
        const isVert = idx === q.vertical_col_index;
        slot.textContent = compact[idx] || (isVert ? '★' : '');
      });
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ CHỐT HÀNG NGANG';
    submitBtn.disabled = this.isQuestionAnswered;

    const checkRowAnswer = () => {
      if (this.isQuestionAnswered) return;
      const rawVal = input.value.trim();
      if (!rawVal) {
        input.focus();
        return;
      }

      const typedNorm = normalizeVietnamese(rawVal).replace(/\s+/g, '');
      const targetNorm = normalizeVietnamese(q.correct_answer).replace(/\s+/g, '');
      const isCorrect = typedNorm === targetNorm;

      this.finalizeInteractiveAnswer(
        q,
        isCorrect,
        (correct) => {
          const team = gameshow.teams[this.selectedTeamIndex];
          if (correct) {
            gameshow.r2OpenedRows[rowIdx] = true;
            gameshow.r2AnsweredCount++;
            gameshow.modifyScore(team.id, +20, `Giải đúng Hàng ngang ${rowIdx + 1}: ${q.word_display}`);
          } else {
            gameshow.modifyScore(team.id, -10, `Trả lời sai Hàng ngang ${rowIdx + 1}`);
          }
        },
        () => {
          if (!gameshow.r2OpenedRows[rowIdx]) {
            gameshow.r2OpenedRows[rowIdx] = true;
          }
          this.render();
        },
        `Đáp án Hàng ngang ${rowIdx + 1}: "${q.word_display}" (Mở chữ cái Hàng Dọc: "${q.vertical_char}").`
      );
    };

    this.attachThrottledSubmit(submitBtn, checkRowAnswer, input);

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);
    panel.appendChild(inputRow);

    // Nút quay về Bảng Ô Chữ
    if (isAlreadySolved || this.isQuestionAnswered) {
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'gs-r1-back-to-board-btn unlocked';
      backBtn.innerHTML = `🔙 QUAY VỀ BẢNG Ô CHỮ (ĐÃ GIẢI MÃ HÀNG NGANG SỐ ${rowIdx + 1})`;
      backBtn.addEventListener('click', () => {
        this.clearActiveToast();
        this.r2ActiveRowQuestion = false;
        this.resetCurrentQuestionAttemptState();
        sfx.playSuccess();
        this.render();
      });
      panel.appendChild(backBtn);
    } else {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'gs-r1-back-to-board-btn secondary';
      cancelBtn.innerHTML = '⬅ Quay về bảng ô chữ (Chưa mở hàng này)';
      cancelBtn.addEventListener('click', () => {
        this.clearActiveToast();
        this.r2ActiveRowQuestion = false;
        this.resetCurrentQuestionAttemptState();
        this.render();
      });
      panel.appendChild(cancelBtn);
    }

    return panel;
  }

  private renderGuessVerticalKeywordCard(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    if (gameshow.teams[this.selectedTeamIndex]?.isEliminatedInRound2Vertical) {
      const availableIdx = gameshow.teams.findIndex((t) => !t.isEliminatedInRound2Vertical);
      if (availableIdx !== -1) {
        this.selectedTeamIndex = availableIdx;
      }
    }

    const points = gameshow.getRound2VerticalGuessPoints();

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = `🌟 ĐOÁN TỪ KHÓA HÀNG DỌC (+${points} ĐIỂM NẾU ĐÚNG · -10 ĐIỂM NẾU SAI)`;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = r2Data.vertical_hint;
    panel.appendChild(text);

    // 7 Vertical Keyword Preview Slots showing already unlocked letters
    const previewWrap = document.createElement('div');
    previewWrap.className = 'gs-cw-answer-preview';
    r2Data.vertical_cells.forEach((ch, idx) => {
      const isUnlocked = gameshow.r2OpenedRows[idx] || gameshow.r2VerticalRevealed;
      const slot = document.createElement('div');
      slot.className = `gs-cw-preview-slot vert-highlight ${isUnlocked ? 'revealed' : ''}`;
      slot.textContent = isUnlocked ? ch : '?';
      previewWrap.appendChild(slot);
    });
    panel.appendChild(previewWrap);

    const teamTickBox = document.createElement('div');
    teamTickBox.className = 'gs-guess-team-tick-box';

    const tickLabel = document.createElement('div');
    tickLabel.className = 'gs-guess-team-tick-label';
    tickLabel.textContent = 'CHỌN NHÓM ĐANG ĐOÁN TỪ KHÓA HÀNG DỌC:';
    teamTickBox.appendChild(tickLabel);

    const tickGrid = document.createElement('div');
    tickGrid.className = 'gs-guess-team-tick-grid';

    gameshow.teams.forEach((team, idx) => {
      const isSelected = idx === this.selectedTeamIndex;
      const isEliminated = Boolean(team.isEliminatedInRound2Vertical);
      const tickBtn = document.createElement('button');
      tickBtn.type = 'button';
      tickBtn.className = `gs-guess-team-tick-btn ${isSelected ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`;
      tickBtn.style.borderColor = isSelected ? 'var(--gs-gold)' : team.color;
      tickBtn.disabled = isEliminated || this.isQuestionAnswered;
      tickBtn.innerHTML = `
        <span class="gs-tick-icon">${isSelected ? '☑️' : '⬜'}</span>
        <span>${team.name}${isEliminated ? ' (❌ Đã đoán sai)' : ''}</span>
      `;
      tickBtn.addEventListener('click', () => {
        if (isEliminated || this.isQuestionAnswered) return;
        this.selectedTeamIndex = idx;
        sfx.playBuzzer();
        this.render();
      });
      tickGrid.appendChild(tickBtn);
    });

    teamTickBox.appendChild(tickGrid);
    panel.appendChild(teamTickBox);

    const inputRow = document.createElement('div');
    inputRow.className = 'gs-fillin-row';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'gs-fillin-input';
    input.placeholder = `Nhập Từ khóa Hàng Dọc (7 chữ cái) cho [${currentTeam.name}]...`;
    input.disabled = this.isQuestionAnswered;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ CHỐT TỪ KHÓA HÀNG DỌC';
    submitBtn.disabled = this.isQuestionAnswered;

    const checkVerticalGuess = () => {
      if (this.isQuestionAnswered) return;
      const rawValue = input.value.trim();
      if (!rawValue) {
        input.focus();
        return;
      }

      const answeringTeam = gameshow.teams[this.selectedTeamIndex];
      if (answeringTeam.isEliminatedInRound2Vertical) {
        this.showScoreToast(
          answeringTeam.name,
          0,
          `⚠️ ${answeringTeam.name} đã đoán sai Từ khóa Hàng Dọc trước đó và mất lượt. Hãy chọn đội khác!`,
          2400
        );
        return;
      }

      this.isQuestionAnswered = true;
      input.disabled = true;
      submitBtn.disabled = true;

      const normTyped = normalizeVietnamese(rawValue).replace(/\s+/g, '');
      const normTarget = normalizeVietnamese(r2Data.vertical_keyword).replace(/\s+/g, '');
      const isCorrect = normTyped === normTarget || normTyped.includes(normTarget);

      if (isCorrect) {
        input.classList.add('correct');
        gameshow.modifyScore(answeringTeam.id, points, 'Giải mã đúng Từ khóa Hàng Dọc Vòng 2');
        gameshow.r2OpenedRows.fill(true);
        gameshow.r2VerticalRevealed = true;
        gameshow.markStationCompleted('M02');
        sfx.playSuccess();
        sfx.playGong();

        const totalKeys = gameshow.getCollectedKeysCount();
        this.showScoreToast(
          answeringTeam.name,
          points,
          `🎉 CHÍNH XÁC! Từ khóa Hàng Dọc là: "${r2Data.vertical_keyword}".\n(${answeringTeam.name} giành +${points} điểm và mở khóa Chìa Khóa Vòng 2: ${totalKeys}/4!)`,
          4200,
          () => {
            this.isGuessingVerticalKeyword = false;
            this.r2ActiveRowQuestion = false;
            this.render();
            if (totalKeys >= 4) {
              this.showDrumUnsealedCelebrationToast();
            }
          }
        );
      } else {
        input.classList.add('incorrect');
        answeringTeam.isEliminatedInRound2Vertical = true;
        gameshow.modifyScore(answeringTeam.id, -10, 'Đoán sai Từ khóa Hàng Dọc Vòng 2');
        sfx.playFailure();

        const allEliminatedNow = gameshow.teams.every((t) => Boolean(t.isEliminatedInRound2Vertical));
        if (allEliminatedNow) {
          gameshow.r2OpenedRows.fill(true);
          gameshow.r2VerticalRevealed = true;
          this.showScoreToast(
            'TẤT CẢ CÁC NHÓM ĐỀU ĐOÁN SAI HÀNG DỌC',
            -10,
            `❌ Đáp án "${rawValue}" chưa chính xác!\nTất cả các nhóm đều đã hết lượt đoán. Từ khóa Hàng Dọc chính xác là: "${r2Data.vertical_keyword}"!`,
            4200,
            () => {
              this.isGuessingVerticalKeyword = false;
              this.r2ActiveRowQuestion = false;
              this.render();
            }
          );
        } else {
          const remaining = gameshow.teams.filter((t) => !t.isEliminatedInRound2Vertical);
          this.showScoreToast(
            `❌ ${answeringTeam.name} ĐOÁN SAI (MẤT LƯỢT HÀNG DỌC)`,
            -10,
            `Đáp án "${rawValue}" chưa chính xác! Từ khóa Hàng Dọc vẫn đang giữ kín.\n👉 Chuyển quyền đoán cho: ${remaining.map((t) => t.name).join(', ')}`,
            3400,
            () => {
              this.isQuestionAnswered = false;
              const nextIdx = gameshow.teams.findIndex((t) => !t.isEliminatedInRound2Vertical);
              if (nextIdx !== -1) {
                this.selectedTeamIndex = nextIdx;
              }
              this.render();
            }
          );
        }
      }
    };

    this.attachThrottledSubmit(submitBtn, checkVerticalGuess, input);

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);
    panel.appendChild(inputRow);

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'gs-r1-back-to-board-btn secondary';
    cancelBtn.innerHTML = '⬅ Quay về bảng ô chữ';
    cancelBtn.addEventListener('click', () => {
      this.clearActiveToast();
      this.isGuessingVerticalKeyword = false;
      this.render();
    });
    panel.appendChild(cancelBtn);

    return panel;
  }

  // ==========================================================================
  // ROUND 3: TIẾNG VANG ĐẠI NGÀN (Audio, True/False, Ordering, Matching, Fill-in)
  // ==========================================================================
  private getQuestionFormatLabel(type?: string): string {
    switch (type) {
      case 'audio':
        return 'NHẬN DIỆN ÂM THANH DI SẢN';
      case 'true_false':
        return 'TICK ĐÚNG / SAI ĐA MỆNH ĐỀ';
      case 'ordering':
        return 'SẮP XẾP THỨ TỰ CHÍNH XÁC';
      case 'matching':
        return 'NỐI 2 VẾ TẠO Ý ĐÚNG';
      case 'fill_in':
        return 'ĐIỀN KHUYẾT TỪ KHÓA';
      default:
        return 'TRẮC NGHIỆM KIẾN THỨC';
    }
  }

  private renderRound3(): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const q = r3Data.questions[this.currentQuestionIndex % r3Data.questions.length];

    if (!this.isQuestionRevealed) {
      const qTypeLabel = this.getQuestionFormatLabel(q.type);
      const promptPanel = this.createRevealQuestionPrompt(
        `CÂU ${this.currentQuestionIndex + 1}/${r3Data.questions.length} · ${qTypeLabel}`,
        `1. Dạng câu hỏi: <strong>${qTypeLabel}</strong> (+20 điểm nếu đúng, -10 điểm nếu sai).<br>2. Nếu trả lời SAI, đáp án chưa hiển thị mà đội đó bị đánh dấu mất lượt và nhường quyền trả lời cho đội tiếp theo.<br>3. Bấm nút bên dưới để hiển thị nội dung câu hỏi!`
      );
      container.appendChild(promptPanel);
    } else {
      if (q.type === 'audio') {
        const visualizer = document.createElement('div');
        visualizer.className = 'gs-audio-visualizer';
        for (let i = 0; i < 5; i++) {
          const bar = document.createElement('div');
          bar.className = 'gs-audio-bar';
          visualizer.appendChild(bar);
        }

        const playAudioBtn = document.createElement('button');
        playAudioBtn.className = 'gs-guess-painting-btn';
        playAudioBtn.style.maxWidth = '380px';
        playAudioBtn.style.margin = '2px auto 10px';
        playAudioBtn.textContent = '🔊 PHÁT ĐOẠN ÂM THANH NHẠC CỤ';
        playAudioBtn.addEventListener('click', () => {
          if (q.audio_type === 'dan_tinh') sfx.playDanTinhSample();
          else if (q.audio_type === 'khen_mong') sfx.playKhenMongSample();
          else sfx.playGong();
        });

        container.appendChild(visualizer);
        container.appendChild(playAudioBtn);
      }

      const subtitle = `${this.getQuestionFormatLabel(q.type)} (+20 / -10 ĐIỂM)`;
      const qPanel = this.renderQuestionByFormat(q, subtitle, (isCorrect) => {
        const currentTeam = gameshow.teams[this.selectedTeamIndex];
        const delta = isCorrect ? 20 : -10;
        gameshow.modifyScore(currentTeam.id, delta, isCorrect ? 'Trả lời đúng Vòng 3' : 'Trả lời sai Vòng 3');
      });
      container.appendChild(qPanel);
    }

    const nav = this.createRoundNav(r3Data.questions.length, 'M03', 'Vòng 3: Tiếng Vang Đại Ngàn');
    container.appendChild(nav);

    return container;
  }

  // ==========================================================================
  // ROUND 4: LỬA THIÊNG ĐẠI NGÀN (Torches & Prey Pot Stealing)
  // ==========================================================================
  private renderRound4(): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];
    const currentTorch = this.r4Torches[currentTeam.id] || null;
    const q = r4Data.questions[this.currentQuestionIndex % r4Data.questions.length];
    const qTypeLabel = this.getQuestionFormatLabel((q as { type?: string }).type);

    // Inline Torch Selector Row
    const torchRow = document.createElement('div');
    torchRow.className = 'gs-torch-row';

    const silverBtn = document.createElement('button');
    silverBtn.type = 'button';
    silverBtn.className = `gs-torch-card gs-torch-silver ${currentTorch === 'silver' ? 'active' : ''}`;
    silverBtn.textContent = `🥈 ĐUỐC BẠC CHO ${currentTeam.name} (x2: +40 / -40đ)`;
    silverBtn.disabled = this.isQuestionAnswered;
    silverBtn.addEventListener('click', () => {
      if (this.isQuestionAnswered) return;
      this.r4Torches[currentTeam.id] = currentTorch === 'silver' ? null : 'silver';
      sfx.playCardActivate();
      this.render();
    });

    const goldBtn = document.createElement('button');
    goldBtn.type = 'button';
    goldBtn.className = `gs-torch-card gs-torch-gold ${currentTorch === 'gold' ? 'active' : ''}`;
    goldBtn.textContent = `🥇 ĐUỐC VÀNG CHO ${currentTeam.name} (x3: +60 / -60đ)`;
    goldBtn.disabled = this.isQuestionAnswered;
    goldBtn.addEventListener('click', () => {
      if (this.isQuestionAnswered) return;
      this.r4Torches[currentTeam.id] = currentTorch === 'gold' ? null : 'gold';
      sfx.playCardActivate();
      this.render();
    });

    torchRow.appendChild(silverBtn);
    torchRow.appendChild(goldBtn);
    container.appendChild(torchRow);

    // Prey Pot Alert
    if (gameshow.preyPot > 0) {
      const pot = document.createElement('div');
      pot.className = 'gs-prey-pot';
      pot.innerHTML = `🔥 <strong>QUỸ SĂN MỒI ĐANG MỞ: +${gameshow.preyPot} ĐIỂM!</strong> (Đội tiếp theo trả lời đúng câu hỏi này sẽ cướp trọn thêm +${gameshow.preyPot} điểm!)`;
      container.appendChild(pot);
    }

    if (!this.isQuestionRevealed) {
      const promptPanel = this.createRevealQuestionPrompt(
        `CÂU ${this.currentQuestionIndex + 1}/${r4Data.questions.length} · ĐỘ KHÓ: ${q.difficulty.toUpperCase()} · ${qTypeLabel}`,
        `1. Dựa vào độ khó <strong>"${q.difficulty}"</strong> (${qTypeLabel}), đội đang thi có thể chọn bật <strong>Đuốc Bạc (x2: +40/-40đ)</strong>, <strong>Đuốc Vàng (x3: +60/-60đ)</strong> hoặc không dùng đuốc (+20/-10đ).<br>2. Nếu trả lời SAI, đáp án vẫn giữ kín, số điểm bị trừ khi dùng Đuốc sẽ rơi vào <strong>Quỹ Săn Mồi</strong> và chuyển lượt ngay cho đội khác trả lời cướp điểm!<br>3. Bấm nút bên dưới khi đã sẵn sàng mở câu hỏi!`
      );
      container.appendChild(promptPanel);
    } else {
      const qPanel = this.renderQuestionByFormat(
        q,
        `CHUNG KẾT · ĐỘ KHÓ: ${q.difficulty.toUpperCase()} · ${qTypeLabel}`,
        (isCorrect) => {
          const answeringTeam = gameshow.teams[this.selectedTeamIndex];
          const torch = this.r4Torches[answeringTeam.id];
          let baseDelta = isCorrect ? 20 : -10;
          if (torch === 'silver') baseDelta = isCorrect ? 40 : -40;
          else if (torch === 'gold') baseDelta = isCorrect ? 60 : -60;

          if (isCorrect) {
            const stolenPot = gameshow.preyPot;
            const totalGain = baseDelta + stolenPot;
            gameshow.preyPot = 0;
            this.r4Torches[answeringTeam.id] = null;
            gameshow.modifyScore(
              answeringTeam.id,
              totalGain,
              stolenPot > 0
                ? `Trả lời đúng (+${baseDelta}đ) & Cướp Quỹ Săn Mồi (+${stolenPot}đ)`
                : 'Đúng câu hỏi chung kết'
            );
          } else {
            if (torch === 'silver' || torch === 'gold') {
              gameshow.preyPot += Math.abs(baseDelta);
              sfx.playPreyWarning();
            }
            this.r4Torches[answeringTeam.id] = null;
            gameshow.modifyScore(answeringTeam.id, baseDelta, 'Sai câu hỏi chung kết');
          }
        }
      );
      container.appendChild(qPanel);
    }

    const nav = this.createRoundNav(r4Data.questions.length, 'M04', 'Vòng 4: Lửa Thiêng Đại Ngàn');
    container.appendChild(nav);

    return container;
  }

  private createRevealQuestionPrompt(title: string, instructionsHtml: string): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel gs-r1-prompt-panel gs-reveal-hero-panel';
    panel.style.justifyContent = 'center';
    panel.style.alignItems = 'center';
    panel.style.textAlign = 'center';

    const emblem = document.createElement('div');
    emblem.className = 'gs-prompt-hero-emblem';
    emblem.innerHTML = '🥁 🌟 📜';
    panel.appendChild(emblem);

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme gs-prompt-hero-title';
    theme.textContent = title;
    panel.appendChild(theme);

    const desc = document.createElement('div');
    desc.className = 'gs-prompt-hero-desc';
    desc.innerHTML = instructionsHtml;
    panel.appendChild(desc);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'gs-guess-painting-btn gs-prompt-hero-btn';
    openBtn.textContent = '📖 BẤM ĐỂ HIỂN THỊ CÂU HỎI';
    openBtn.addEventListener('click', () => {
      this.isQuestionRevealed = true;
      sfx.playBuzzer();
      this.startQuestionTimer();
      this.render();
    });
    panel.appendChild(openBtn);

    return panel;
  }

  // ==========================================================================
  // GRAND FINALE: BỨC TRANH ĐẠI ĐOÀN KẾT 54 DÂN TỘC VIỆT NAM
  // ==========================================================================
  private renderGrandFinale(): HTMLElement {
    if (gameshow.getCollectedKeysCount() < 4) {
      const lockedBox = document.createElement('div');
      lockedBox.className = 'gs-finale-locked-box';
      const keys = gameshow.getCollectedKeysCount();
      lockedBox.innerHTML = `
        <div class="gs-locked-icon">🔒</div>
        <h2>TRỐNG ĐỒNG ĐÔNG SƠN ĐANG BỊ PHONG ẤN!</h2>
        <p>Hiện tại các đội mới thu thập được <strong style="color:var(--gs-gold)">${keys}/4</strong> Chìa Khóa.</p>
        <p>Để bước vào ĐẠI KẾT CỤC, bạn cần hoàn thành cả 4 Vòng thi (còn thiếu <strong class="gs-text-danger">${4 - keys}</strong> chìa khóa).</p>
        <button class="gs-btn-back-hub" style="margin-top:24px; font-size:18px; padding:14px 32px;">🚶 QUAY LẠI BẢN ĐỒ ĐỂ KHÁM PHÁ TIẾP</button>
      `;
      lockedBox.querySelector('button')!.addEventListener('click', () => this.close());
      return lockedBox;
    }

    if (this.isGrandFinaleCelebration) {
      return this.renderGrandVictoryCelebrationArea();
    }

    const layout = document.createElement('div');
    layout.className = 'gs-finale-container';

    const leftCol = document.createElement('div');
    leftCol.className = 'gs-finale-centerpiece';

    const drumFrame = document.createElement('div');
    drumFrame.className = 'gs-finale-drum-frame';

    const drumImg = document.createElement('img');
    drumImg.src = 'assets/sprites/trong_dong_dong_son.svg';
    drumImg.alt = 'Trống Đồng Đông Sơn Hoàng Kim';
    drumImg.className = 'gs-finale-drum-img';
    drumFrame.appendChild(drumImg);
    leftCol.appendChild(drumFrame);

    const infoCol = document.createElement('div');
    infoCol.className = 'gs-finale-banner-info';

    const drumBadge = document.createElement('div');
    drumBadge.className = 'gs-finale-drum-badge';
    drumBadge.innerHTML = '✨ TRỐNG ĐỒNG ĐÔNG SƠN HOÀNG KIM ✨';
    infoCol.appendChild(drumBadge);

    const quote = document.createElement('div');
    quote.className = 'gs-finale-quote';
    quote.innerHTML = `
      <p>“Sông có thể cạn, núi có thể mòn, song chân lý ấy không bao giờ thay đổi: <strong>Nước Việt Nam là một, Dân tộc Việt Nam là một!</strong>”</p>
      <span>— Chủ tịch Hồ Chí Minh —</span>
    `;
    infoCol.appendChild(quote);

    leftCol.appendChild(infoCol);

    layout.appendChild(leftCol);

    if (!this.isQuestionRevealed) {
      const promptCol = this.createRevealQuestionPrompt(
        '🌟 THỬ THÁCH ĐẠI KẾT CỤC · GIẢI MÃ TRỐNG ĐỒNG ĐÔNG SƠN',
        `1. Cả 4 Chìa Khóa Văn Hóa đã hội tụ mở khóa <strong>Trống Đồng Đông Sơn Hoàng Kim</strong>!<br>2. Chọn Đội hoặc Cá nhân đại diện trả lời câu hỏi ý nghĩa cuối cùng (+100 điểm danh dự).<br>3. Khi đã sẵn sàng, bấm nút bên dưới để mở câu hỏi và tiến tới <strong>Khu Vực Chúc Mừng Hoàn Thành Cuộc Chơi</strong>!`
      );
      layout.appendChild(promptCol);
    } else {
      const qPanel = this.renderQuestionCard(
        finaleData.challenge_question,
        '🌟 PHẦN THƯỞNG ĐẶC BIỆT DÀNH CHO ĐỘI / CÁ NHÂN GIẢI MÃ Ý NGHĨA (+100 ĐIỂM)',
        (isCorrect) => {
          const currentTeam = gameshow.teams[this.selectedTeamIndex];
          if (isCorrect) {
            gameshow.modifyScore(currentTeam.id, +100, 'Giải mã Đại Kết Cục Trống Đồng');
            gameshow.markStationCompleted('board');
            sfx.playGong();
          } else {
            gameshow.modifyScore(currentTeam.id, -10, 'Chưa giải mã đúng câu Đại Kết Cục');
          }
        },
        () => {
          if (gameshow.isStationCompleted('board')) {
            this.isGrandFinaleCelebration = true;
          }
          this.render();
        }
      );
      layout.appendChild(qPanel);
    }

    return layout;
  }

  // ==========================================================================
  // KHU VỰC CHÚC MỪNG HOÀN THÀNH CUỘC CHƠI (GRAND VICTORY PODIUM)
  // ==========================================================================
  private renderGrandVictoryCelebrationArea(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'gs-victory-hall';

    const rankedTeams = [...gameshow.teams].sort((a, b) => b.score - a.score);
    const champion = rankedTeams[0];

    const medals = ['🥇 QUÁN QUÂN', '🥈 Á QUÂN', '🥉 HẠNG BA', '🏅 KHUYẾN KHÍCH', '🏅 KHUYẾN KHÍCH'];

    const podiumHTML = rankedTeams
      .map(
        (team, idx) => `
        <div class="gs-victory-rank-card ${idx === 0 ? 'champion' : ''}" style="border-color: ${team.color}">
          <div class="gs-victory-rank-medal">${medals[idx] || `HẠNG ${idx + 1}`}</div>
          <div class="gs-victory-rank-name" style="color: ${team.color}">${team.name}</div>
          <div class="gs-victory-rank-score">${team.score} <span>ĐIỂM</span></div>
        </div>
      `
      )
      .join('');

    wrap.innerHTML = `
      <div class="gs-victory-banner">
        <div class="gs-victory-crown">👑🎉🏆🎉👑</div>
        <h1 class="gs-victory-title">CHÚC MỪNG HOÀN THÀNH HÀNH TRÌNH</h1>
        <h2 class="gs-victory-subtitle">“THANH ÂM ĐẠI NGÀN — ĐẠI ĐOÀN KẾT 54 DÂN TỘC VIỆT NAM”</h2>
        <p class="gs-victory-desc">
          🏆 <strong>${finaleData.challenge_question.special_reward_title}</strong><br>
          ${finaleData.challenge_question.special_reward_message}
        </p>
        <div class="gs-victory-champion-spotlight">
          🌟 NHÓM CHIẾN THẮNG CHUNG CUỘC: <strong style="color:${champion.color}">${champion.name.toUpperCase()} (${champion.score} ĐIỂM)</strong> 🌟
        </div>
      </div>

      <div class="gs-victory-podium-grid">
        ${podiumHTML}
      </div>

      <div class="gs-victory-actions">
        <button type="button" class="gs-victory-btn primary" data-action="ending">
          📜 VÀO KHU VỰC TỔNG KẾT HÀNH TRÌNH
        </button>
        <button type="button" class="gs-victory-btn secondary" data-action="replay-finale">
          🔄 XEM LẠI CÂU HỎI ĐẠI KẾT CỤC
        </button>
        <button type="button" class="gs-victory-btn hub" data-action="hub">
          🚶 DẠO QUANH BẢN ĐỒ LỄ HỘI
        </button>
      </div>
    `;

    const endingBtn = wrap.querySelector<HTMLButtonElement>('[data-action="ending"]');
    endingBtn?.addEventListener('click', () => {
      sfx.playGong();
      this.close();
      if (this.onFinishGameCallback) {
        this.onFinishGameCallback();
      }
    });

    const replayBtn = wrap.querySelector<HTMLButtonElement>('[data-action="replay-finale"]');
    replayBtn?.addEventListener('click', () => {
      this.isGrandFinaleCelebration = false;
      this.isQuestionRevealed = false;
      this.resetCurrentQuestionAttemptState();
      this.render();
    });

    const hubBtn = wrap.querySelector<HTMLButtonElement>('[data-action="hub"]');
    hubBtn?.addEventListener('click', () => {
      this.close();
    });

    return wrap;
  }

  // ==========================================================================
  // DISPATCHER CHO CÁC DẠNG CÂU HỎI (Trắc nghiệm, Đúng/Sai, Sắp xếp, Nối cặp, Điền từ)
  // ==========================================================================
  private renderQuestionByFormat(
    q: {
      type?: string;
      question: string;
      options?: string[];
      correct_index?: number;
      correct_answer?: string;
      statements?: Array<{ text: string; is_true: boolean }>;
      items?: string[];
      initial_order?: number[];
      left_items?: string[];
      right_items?: string[];
      correct_pairs?: number[];
      explanation?: string;
      has_card?: string | null;
    },
    subtitle: string,
    onAnswer: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void
  ): HTMLElement {
    this.ensureInteractiveQuestionState(q);

    if (q.type === 'true_false' && q.statements && q.statements.length) {
      return this.renderTrueFalseQuestionCard(q as Required<Pick<typeof q, 'question' | 'statements'>> & typeof q, subtitle, onAnswer, onCompleteAfterToast);
    }
    if (q.type === 'ordering' && q.items && q.items.length) {
      return this.renderOrderingQuestionCard(q as Required<Pick<typeof q, 'question' | 'items'>> & typeof q, subtitle, onAnswer, onCompleteAfterToast);
    }
    if (q.type === 'matching' && q.left_items && q.right_items && q.correct_pairs) {
      return this.renderMatchingQuestionCard(
        q as Required<Pick<typeof q, 'question' | 'left_items' | 'right_items' | 'correct_pairs'>> & typeof q,
        subtitle,
        onAnswer,
        onCompleteAfterToast
      );
    }
    if (q.type === 'fill_in') {
      return this.renderFillInQuestionCard(q, subtitle, onAnswer, onCompleteAfterToast);
    }
    return this.renderQuestionCard(q, subtitle, onAnswer, onCompleteAfterToast);
  }

  /**
   * Cơ chế chấm điểm & chuyển lượt thống nhất cho TẤT CẢ các vòng:
   * - Nếu trả lời ĐÚNG: Mở đáp án, cộng điểm (và cướp Quỹ Săn Mồi nếu có), hiển thị giải thích chi tiết.
   * - Nếu trả lời SAI:
   *   + Đánh dấu đội vừa trả lời là "Đã sai (Mất lượt)" ở câu hỏi hiện tại.
   *   + Nếu VẪN CÒN đội khác chưa trả lời câu này: CHƯA hiển thị đáp án đúng và giải thích, tự động chuyển quyền trả lời sang đội tiếp theo!
   *   + Nếu CẢ 4 ĐỘI đều đã trả lời sai: Mở đáp án đúng và hiển thị giải thích.
   */
  private finalizeInteractiveAnswer(
    q: {
      explanation?: string;
      has_card?: string | null;
      initial_order?: number[];
      items?: string[];
      special_reward_title?: string;
      special_reward_message?: string;
    },
    isCorrect: boolean,
    onAnswer: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void,
    extraPrefix = ''
  ) {
    const currentTeam = gameshow.teams[this.selectedTeamIndex];

    if (isCorrect) {
      this.isQuestionAnswered = true;
      sfx.playSuccess();
      onAnswer(true);
      gameshow.consumeBlockedTurns();

      const lastDelta = gameshow.lastScoreDeltas[gameshow.lastScoreDeltas.length - 1];
      const delta = lastDelta ? lastDelta.delta : 20;

      const afterToast = () => {
        if (onCompleteAfterToast) {
          onCompleteAfterToast();
        } else {
          this.render();
        }
      };

      // Cập nhật giao diện ngay lập tức để hiển thị khung Đáp Án Chính Xác & Giải Thích trên thẻ câu hỏi
      this.render();

      if (this.activeStationId === 'board') {
        this.showScoreToast(
          `🌟 ${currentTeam.name} GIẢI MÃ THÀNH CÔNG!`,
          100,
          `🏆 ${q.special_reward_title || ''}\n\n${q.special_reward_message || ''}`,
          4200,
          afterToast
        );
      } else {
        const awardedCard = gameshow.claimQuestionCard(this.activeStationId, this.currentQuestionIndex);

        if (awardedCard) {
          gameshow.awardCard(currentTeam.id, awardedCard);
          this.showCardAwardToast(currentTeam.name, awardedCard, afterToast);
          return;
        }

        const fullExplanation = extraPrefix || "Chính xác!";
        const reasonNote = lastDelta && lastDelta.reason.includes('Quỹ Săn Mồi')
          ? `🔥 ${lastDelta.reason}!\n\n${fullExplanation}`
          : fullExplanation;
        this.showScoreToast(currentTeam.name, delta, reasonNote, 3800, afterToast);
        return;
      }
      return;
    }

    // TRƯỜNG HỢP TRẢ LỜI SAI
    sfx.playFailure();
    onAnswer(false);
    this.failedTeamIdsOnQuestion.add(currentTeam.id);
    this.questionWrongAttemptCount++;

    const lastDelta = gameshow.lastScoreDeltas[gameshow.lastScoreDeltas.length - 1];
    const delta = lastDelta ? lastDelta.delta : -10;

    const remainingTeams = gameshow.teams.filter(
      (t) => !this.failedTeamIdsOnQuestion.has(t.id) && !t.isBlockedNextQuestion
    );

    if (remainingTeams.length > 0) {
      // Vẫn còn đội khác có thể trả lời -> CHƯA mở đáp án, chuyển lượt sang đội tiếp theo!
      this.isQuestionAnswered = false;
      const nextTeam = remainingTeams[0];
      const nextIdx = gameshow.teams.findIndex((t) => t.id === nextTeam.id);

      const preyNotice = this.activeStationId === 'M04' && gameshow.preyPot > 0
        ? `\n🔥 QUỸ SĂN MỒI ĐANG CÓ +${gameshow.preyPot} ĐIỂM! Đội tiếp theo trả lời đúng sẽ cướp trọn số điểm này!`
        : '';

      this.showScoreToast(
        `❌ ${currentTeam.name} TRẢ LỜI SAI (MẤT LƯỢT CÂU NÀY)`,
        delta,
        `Đáp án vẫn đang được giữ kín để đội khác trả lời!\n👉 Chuyển quyền trả lời sang: ${nextTeam.name} (Còn ${remainingTeams.length} nhóm còn lượt ở câu này).${preyNotice}`,
        3200,
        () => {
          if (nextIdx !== -1) {
            this.selectedTeamIndex = nextIdx;
          }
          this.isQuestionAnswered = false;
          this.resetInteractiveSelectionsOnly(q);
          this.render();
        }
      );
    } else {
      // Tất cả 4 đội đều đã trả lời sai -> Mở đáp án chính thức ở tất cả các mini game!
      this.isQuestionAnswered = true;
      gameshow.consumeBlockedTurns();

      // Vòng 1: Dù cả 4 đội trả lời sai, mảnh ghép vừa chọn vẫn được mở khóa hình ảnh khi quay về bảng
      if (this.activeStationId === 'M01' && this.r1ActiveTileQuestion) {
        if (!gameshow.r1OpenedTiles[this.currentQuestionIndex]) {
          gameshow.r1OpenedTiles[this.currentQuestionIndex] = true;
          gameshow.r1AnsweredCount++;
        }
      }

      // Vòng 2: Dù cả 4 đội trả lời sai, hàng ngang vẫn được lật mở đáp án và lộ chữ cái Hàng Dọc
      if (this.activeStationId === 'M02' && this.r2ActiveRowQuestion) {
        if (!gameshow.r2OpenedRows[this.currentQuestionIndex]) {
          gameshow.r2OpenedRows[this.currentQuestionIndex] = true;
          gameshow.r2AnsweredCount++;
        }
      }

      // Cập nhật giao diện ngay lập tức để hiển thị khung Đáp Án Chính Xác & Giải Thích trên thẻ câu hỏi
      this.render();

      const fullExplanation = `📢 Tất cả các nhóm đều đã trả lời sai câu hỏi này! Đáp án chính xác:\n${extraPrefix ? extraPrefix : ""}`;
      this.showScoreToast(
        '📢 TẤT CẢ CÁC NHÓM ĐỀU TRẢ LỜI SAI · MỞ ĐÁP ÁN CHÍNH XÁC',
        delta,
        fullExplanation,
        4200,
        () => {
          if (onCompleteAfterToast) {
            onCompleteAfterToast();
          } else {
            this.render();
          }
        }
      );
    }
  }

  /**
   * Hiển thị khung Đáp Án Chính Xác & Giải Thích trực tiếp trên thẻ câu hỏi sau khi có đội trả lời đúng
   * hoặc sau khi cả 4 đội đều trả lời sai. Đồng thời ở Vòng 1 hiển thị nút Quay Về Bảng Mảnh Ghép!
   */
  private appendPostAnswerFooter(panel: HTMLElement, answerSummary: string, _explanation?: string) {
    if (this.isQuestionAnswered) {
      const allFailed = gameshow.teams.every(
        (t) => this.failedTeamIdsOnQuestion.has(t.id) || t.isBlockedNextQuestion
      );
      const ansBanner = document.createElement('div');
      ansBanner.className = 'gs-revealed-answer-banner';
      ansBanner.innerHTML = `
        <div class="gs-revealed-answer-title">
          ${allFailed ? '📢 TẤT CẢ CÁC NHÓM ĐỀU TRẢ LỜI SAI — ĐÁP ÁN CHÍNH XÁC LÀ:' : '✅ ĐÁP ÁN CHÍNH XÁC:'}
          <span>${answerSummary}</span>
        </div>
      `;
      panel.appendChild(ansBanner);

      if (this.activeStationId === 'M01' && this.r1ActiveTileQuestion) {
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'gs-r1-back-to-board-btn unlocked';
        backBtn.innerHTML = `🔙 QUAY VỀ BẢNG MẢNH GHÉP (ĐÃ MỞ KHÓA HÌNH ẢNH MẢNH SỐ ${this.currentQuestionIndex + 1})`;
        backBtn.addEventListener('click', () => {
          this.clearActiveToast();
          this.r1ActiveTileQuestion = false;
          this.resetCurrentQuestionAttemptState();
          sfx.playSuccess();
          this.render();
        });
        panel.appendChild(backBtn);
      }
    } else if (this.activeStationId === 'M01' && this.r1ActiveTileQuestion) {
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'gs-r1-back-to-board-btn secondary';
      cancelBtn.innerHTML = '⬅ Quay về bảng mảnh ghép (Chưa mở mảnh này)';
      cancelBtn.addEventListener('click', () => {
        this.clearActiveToast();
        this.r1ActiveTileQuestion = false;
        this.resetCurrentQuestionAttemptState();
        this.render();
      });
      panel.appendChild(cancelBtn);
    }
  }

  // ==========================================================================
  // 1. DẠNG CÂU HỎI TICK ĐÚNG / SAI CHO NHIỀU Ý CÙNG LÚC (true_false)
  // ==========================================================================
  private renderTrueFalseQuestionCard(
    q: {
      question: string;
      statements: Array<{ text: string; is_true: boolean }>;
      explanation?: string;
      has_card?: string | null;
    },
    subtitle: string,
    onAnswer: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = subtitle;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = q.question;
    panel.appendChild(text);

    const listWrap = document.createElement('div');
    listWrap.className = 'gs-tf-list';

    q.statements.forEach((stmt, idx) => {
      const row = document.createElement('div');
      const userChoice = this.tfSelections[idx];
      let stateClass = '';
      if (this.isQuestionAnswered) {
        stateClass = userChoice === stmt.is_true ? 'correct' : 'incorrect';
      }
      row.className = `gs-tf-row ${stateClass}`;

      const badge = document.createElement('div');
      badge.className = 'gs-tf-index';
      badge.textContent = `Ý ${idx + 1}`;

      const content = document.createElement('div');
      content.className = 'gs-tf-statement';
      content.textContent = stmt.text;

      const actions = document.createElement('div');
      actions.className = 'gs-tf-actions';

      const trueBtn = document.createElement('button');
      trueBtn.type = 'button';
      trueBtn.className = `gs-tf-btn true-btn ${userChoice === true ? 'active' : ''}`;
      trueBtn.textContent = '✔ ĐÚNG';
      trueBtn.disabled = this.isQuestionAnswered;
      trueBtn.addEventListener('click', () => {
        if (this.isQuestionAnswered) return;
        this.tfSelections[idx] = true;
        this.interactiveWarningMsg = null;
        sfx.playTick(760);
        this.render();
      });

      const falseBtn = document.createElement('button');
      falseBtn.type = 'button';
      falseBtn.className = `gs-tf-btn false-btn ${userChoice === false ? 'active' : ''}`;
      falseBtn.textContent = '✖ SAI';
      falseBtn.disabled = this.isQuestionAnswered;
      falseBtn.addEventListener('click', () => {
        if (this.isQuestionAnswered) return;
        this.tfSelections[idx] = false;
        this.interactiveWarningMsg = null;
        sfx.playTick(620);
        this.render();
      });

      actions.appendChild(trueBtn);
      actions.appendChild(falseBtn);

      if (this.isQuestionAnswered) {
        const ansTag = document.createElement('span');
        ansTag.className = `gs-tf-ans-tag ${stmt.is_true ? 'is-true' : 'is-false'}`;
        ansTag.textContent = `Đáp án: ${stmt.is_true ? 'ĐÚNG' : 'SAI'}`;
        actions.appendChild(ansTag);
      }

      row.appendChild(badge);
      row.appendChild(content);
      row.appendChild(actions);
      listWrap.appendChild(row);
    });

    panel.appendChild(listWrap);

    if (this.interactiveWarningMsg) {
      const warn = document.createElement('div');
      warn.className = 'gs-interactive-warning';
      warn.textContent = this.interactiveWarningMsg;
      panel.appendChild(warn);
    }

    const footerRow = document.createElement('div');
    footerRow.className = 'gs-interactive-submit-row';

    const selectedCount = q.statements.filter((_, idx) => this.tfSelections[idx] !== undefined).length;
    const statusInfo = document.createElement('span');
    statusInfo.className = 'gs-interactive-status';
    statusInfo.textContent = `Đã tích chọn: ${selectedCount} / ${q.statements.length} mệnh đề`;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ CHỐT ĐÁP ÁN ĐÚNG / SAI';
    submitBtn.disabled = this.isQuestionAnswered;
    const checkTfAnswer = () => {
      if (this.isQuestionAnswered) return;
      if (selectedCount < q.statements.length) {
        this.interactiveWarningMsg = `⚠️ Bạn mới chọn ${selectedCount}/${q.statements.length} mệnh đề. Hãy tích Đúng hoặc Sai cho tất cả các ý trước khi chốt!`;
        sfx.playBuzzer();
        this.render();
        return;
      }

      this.stopQuestionTimer();
      this.interactiveWarningMsg = null;

      const correctCount = q.statements.filter((s, idx) => this.tfSelections[idx] === s.is_true).length;
      const isCorrect = correctCount === q.statements.length;
      const summaryPrefix = `Đáp án đúng: ${q.statements.map((s, i) => `Ý ${i + 1}: ${s.is_true ? 'ĐÚNG' : 'SAI'}`).join(' | ')}.`;
      this.finalizeInteractiveAnswer(q, isCorrect, onAnswer, onCompleteAfterToast, summaryPrefix);
    };
    this.attachThrottledSubmit(submitBtn, checkTfAnswer);

    footerRow.appendChild(statusInfo);
    footerRow.appendChild(submitBtn);
    panel.appendChild(footerRow);

    const tfSummary = q.statements.map((s, i) => `Ý ${i + 1}: ${s.is_true ? 'ĐÚNG' : 'SAI'}`).join('  |  ');
    this.appendPostAnswerFooter(panel, tfSummary, q.explanation);

    return panel;
  }

  // ==========================================================================
  // 2. DẠNG CÂU HỎI SẮP XẾP CÁC Ý ĐÚNG THỨ TỰ (ordering)
  // ==========================================================================
  private renderOrderingQuestionCard(
    q: {
      question: string;
      items: string[];
      initial_order?: number[];
      explanation?: string;
      has_card?: string | null;
    },
    subtitle: string,
    onAnswer: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = subtitle;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = q.question;
    panel.appendChild(text);

    const listWrap = document.createElement('div');
    listWrap.className = 'gs-order-list';

    // Khi đã mở đáp án (có đội trả lời đúng hoặc cả 4 đội đều sai), hiển thị ngay các ý theo đúng thứ tự chuẩn (0, 1, 2, 3)
    const displayOrder = this.isQuestionAnswered ? q.items.map((_, idx) => idx) : this.orderingCurrent;

    displayOrder.forEach((itemIdx, pos) => {
      const row = document.createElement('div');
      const isSwapSelected = this.orderingSwapIdx === pos;
      let stateClass = '';
      if (this.isQuestionAnswered) {
        stateClass = 'correct';
      }
      row.className = `gs-order-row ${isSwapSelected ? 'swap-selected' : ''} ${stateClass}`;

      const stepBadge = document.createElement('div');
      stepBadge.className = 'gs-order-step-badge';
      stepBadge.textContent = `Thứ tự #${pos + 1}`;

      const itemText = document.createElement('div');
      itemText.className = 'gs-order-item-text';
      itemText.textContent = q.items[itemIdx] || '';
      if (!this.isQuestionAnswered) {
        itemText.title = 'Click vào dòng này rồi click dòng khác để đổi vị trí cho nhau';
        itemText.style.cursor = 'pointer';
        itemText.addEventListener('click', () => {
          if (this.isQuestionAnswered) return;
          if (this.orderingSwapIdx === null) {
            this.orderingSwapIdx = pos;
            sfx.playTick(700);
          } else if (this.orderingSwapIdx === pos) {
            this.orderingSwapIdx = null;
          } else {
            const temp = this.orderingCurrent[this.orderingSwapIdx];
            this.orderingCurrent[this.orderingSwapIdx] = this.orderingCurrent[pos];
            this.orderingCurrent[pos] = temp;
            this.orderingSwapIdx = null;
            sfx.playTick(880);
          }
          this.render();
        });
      }

      const controls = document.createElement('div');
      controls.className = 'gs-order-controls';

      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'gs-order-move-btn';
      upBtn.textContent = '⬆ Lên';
      upBtn.disabled = this.isQuestionAnswered || pos === 0;
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isQuestionAnswered || pos === 0) return;
        const temp = this.orderingCurrent[pos - 1];
        this.orderingCurrent[pos - 1] = this.orderingCurrent[pos];
        this.orderingCurrent[pos] = temp;
        this.orderingSwapIdx = null;
        sfx.playTick(840);
        this.render();
      });

      const downBtn = document.createElement('button');
      downBtn.type = 'button';
      downBtn.className = 'gs-order-move-btn';
      downBtn.textContent = '⬇ Xuống';
      downBtn.disabled = this.isQuestionAnswered || pos === this.orderingCurrent.length - 1;
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isQuestionAnswered || pos >= this.orderingCurrent.length - 1) return;
        const temp = this.orderingCurrent[pos + 1];
        this.orderingCurrent[pos + 1] = this.orderingCurrent[pos];
        this.orderingCurrent[pos] = temp;
        this.orderingSwapIdx = null;
        sfx.playTick(680);
        this.render();
      });

      controls.appendChild(upBtn);
      controls.appendChild(downBtn);

      if (this.isQuestionAnswered) {
        const correctPosTag = document.createElement('span');
        correctPosTag.className = 'gs-order-ans-tag';
        correctPosTag.textContent = `✔ Bước #${pos + 1}`;
        controls.appendChild(correctPosTag);
      }

      row.appendChild(stepBadge);
      row.appendChild(itemText);
      row.appendChild(controls);
      listWrap.appendChild(row);
    });

    panel.appendChild(listWrap);

    const footerRow = document.createElement('div');
    footerRow.className = 'gs-interactive-submit-row';

    const hintSpan = document.createElement('span');
    hintSpan.className = 'gs-interactive-status';
    hintSpan.textContent = this.orderingSwapIdx !== null
      ? `🔄 Đang chọn mục ở Thứ tự #${this.orderingSwapIdx + 1} — Click vào mục khác để đổi chỗ!`
      : 'Sắp xếp đúng trình tự từ #1 đến #4 rồi bấm Chốt.';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ CHỐT THỨ TỰ SẮP XẾP';
    submitBtn.disabled = this.isQuestionAnswered;
    const checkOrderAnswer = () => {
      if (this.isQuestionAnswered) return;
      this.stopQuestionTimer();
      this.orderingSwapIdx = null;

      const isCorrect = this.orderingCurrent.every((itemIdx, pos) => itemIdx === pos);
      const summaryPrefix = 'Đã hoàn tất kiểm tra trình tự sắp xếp 4 bước.';
      this.finalizeInteractiveAnswer(q, isCorrect, onAnswer, onCompleteAfterToast, summaryPrefix);
    };
    this.attachThrottledSubmit(submitBtn, checkOrderAnswer);

    footerRow.appendChild(hintSpan);
    footerRow.appendChild(submitBtn);
    panel.appendChild(footerRow);

    this.appendPostAnswerFooter(
      panel,
      'Đã sắp xếp 4 bước theo đúng trình tự chuẩn từ #1 đến #4 ở khung trên.',
      q.explanation
    );

    return panel;
  }

  // ==========================================================================
  // 3. DẠNG CÂU HỎI NỐI GIỮA 2 VẾ ĐỂ TẠO Ý ĐÚNG (matching)
  // ==========================================================================
  private renderMatchingQuestionCard(
    q: {
      question: string;
      left_items: string[];
      right_items: string[];
      correct_pairs: number[];
      explanation?: string;
      has_card?: string | null;
    },
    subtitle: string,
    onAnswer: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = subtitle;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = q.question;
    panel.appendChild(text);

    const pairColors = ['#a63d2f', '#2f4a6b', '#4f6b3a', '#b5562a'];

    const matchGrid = document.createElement('div');
    matchGrid.className = 'gs-matching-grid';

    const leftCol = document.createElement('div');
    leftCol.className = 'gs-matching-col';
    const leftTitle = document.createElement('div');
    leftTitle.className = 'gs-matching-col-header';
    leftTitle.textContent = 'VẾ A (KHÁI NIỆM / TRỤ CỘT)';
    leftCol.appendChild(leftTitle);

    const rightCol = document.createElement('div');
    rightCol.className = 'gs-matching-col';
    const rightTitle = document.createElement('div');
    rightTitle.className = 'gs-matching-col-header';
    rightTitle.textContent = 'VẾ B (NỘI DUNG / BIỂU HIỆN TƯƠNG ỨNG)';
    rightCol.appendChild(rightTitle);

    q.left_items.forEach((leftText, leftIdx) => {
      const card = document.createElement('button');
      card.type = 'button';
      const pairedRightIdx = this.matchingPairs[leftIdx];
      const isSelected = this.matchingSelectedLeft === leftIdx && !this.isQuestionAnswered;
      const color = pairColors[leftIdx % pairColors.length];

      let resultClass = '';
      if (this.isQuestionAnswered) {
        resultClass = pairedRightIdx === q.correct_pairs[leftIdx] ? 'correct' : 'incorrect';
      }

      card.className = `gs-match-card left-card ${isSelected ? 'selected' : ''} ${pairedRightIdx !== undefined ? 'paired' : ''} ${resultClass}`;
      if (pairedRightIdx !== undefined && !this.isQuestionAnswered) {
        card.style.borderColor = color;
      }
      card.disabled = this.isQuestionAnswered;

      const textSpan = document.createElement('div');
      textSpan.className = 'gs-match-card-text';
      textSpan.textContent = leftText;
      card.appendChild(textSpan);

      const badgeRow = document.createElement('div');
      badgeRow.className = 'gs-match-badge-row';

      if (pairedRightIdx !== undefined) {
        const pairTag = document.createElement('span');
        pairTag.className = 'gs-match-pair-pill';
        pairTag.style.background = color;
        pairTag.textContent = `🔗 Đã nối: ${leftIdx + 1} ↔ ${String.fromCharCode(65 + pairedRightIdx)}`;
        badgeRow.appendChild(pairTag);
      } else {
        const waitTag = document.createElement('span');
        waitTag.className = 'gs-match-unpaired-pill';
        waitTag.textContent = isSelected ? '👉 Đang chọn — Hãy click 1 ý ở Vế B' : 'Chưa nối';
        badgeRow.appendChild(waitTag);
      }

      if (this.isQuestionAnswered) {
        const ansKey = document.createElement('span');
        ansKey.className = 'gs-match-correct-key';
        ansKey.textContent = `Đúng: ${leftIdx + 1} ↔ ${String.fromCharCode(65 + q.correct_pairs[leftIdx])}`;
        badgeRow.appendChild(ansKey);
      }

      card.appendChild(badgeRow);

      card.addEventListener('click', () => {
        if (this.isQuestionAnswered) return;
        this.matchingSelectedLeft = leftIdx;
        this.interactiveWarningMsg = null;
        sfx.playTick(740);
        this.render();
      });

      leftCol.appendChild(card);
    });

    q.right_items.forEach((rightText, rightIdx) => {
      const card = document.createElement('button');
      card.type = 'button';

      const pairedLeftEntry = Object.entries(this.matchingPairs).find(([, rIdx]) => rIdx === rightIdx);
      const pairedLeftIdx = pairedLeftEntry ? Number(pairedLeftEntry[0]) : undefined;
      const color = pairedLeftIdx !== undefined ? pairColors[pairedLeftIdx % pairColors.length] : '';

      let resultClass = '';
      if (this.isQuestionAnswered && pairedLeftIdx !== undefined) {
        resultClass = q.correct_pairs[pairedLeftIdx] === rightIdx ? 'correct' : 'incorrect';
      }

      card.className = `gs-match-card right-card ${pairedLeftIdx !== undefined ? 'paired' : ''} ${resultClass}`;
      if (pairedLeftIdx !== undefined && !this.isQuestionAnswered) {
        card.style.borderColor = color;
      }
      card.disabled = this.isQuestionAnswered;

      const textSpan = document.createElement('div');
      textSpan.className = 'gs-match-card-text';
      textSpan.textContent = rightText;
      card.appendChild(textSpan);

      if (pairedLeftIdx !== undefined) {
        const badgeRow = document.createElement('div');
        badgeRow.className = 'gs-match-badge-row';
        const pairTag = document.createElement('span');
        pairTag.className = 'gs-match-pair-pill';
        pairTag.style.background = color;
        pairTag.textContent = `🔗 Cặp ${pairedLeftIdx + 1} ↔ ${String.fromCharCode(65 + rightIdx)}`;
        badgeRow.appendChild(pairTag);
        card.appendChild(badgeRow);
      }

      card.addEventListener('click', () => {
        if (this.isQuestionAnswered) return;
        const activeLeft = this.matchingSelectedLeft !== null ? this.matchingSelectedLeft : 0;

        Object.keys(this.matchingPairs).forEach((k) => {
          const lIdx = Number(k);
          if (this.matchingPairs[lIdx] === rightIdx) {
            delete this.matchingPairs[lIdx];
          }
        });

        this.matchingPairs[activeLeft] = rightIdx;
        this.interactiveWarningMsg = null;

        const nextUnpaired = q.left_items.findIndex((_, idx) => this.matchingPairs[idx] === undefined);
        this.matchingSelectedLeft = nextUnpaired !== -1 ? nextUnpaired : activeLeft;

        sfx.playTick(880);
        this.render();
      });

      rightCol.appendChild(card);
    });

    matchGrid.appendChild(leftCol);
    matchGrid.appendChild(rightCol);
    panel.appendChild(matchGrid);

    if (this.interactiveWarningMsg) {
      const warn = document.createElement('div');
      warn.className = 'gs-interactive-warning';
      warn.textContent = this.interactiveWarningMsg;
      panel.appendChild(warn);
    }

    const footerRow = document.createElement('div');
    footerRow.className = 'gs-interactive-submit-row';

    const pairedCount = Object.keys(this.matchingPairs).length;
    const statusInfo = document.createElement('span');
    statusInfo.className = 'gs-interactive-status';
    statusInfo.textContent = `Đã ghép nối: ${pairedCount} / ${q.left_items.length} cặp`;

    const actionBtns = document.createElement('div');
    actionBtns.style.display = 'flex';
    actionBtns.style.gap = '10px';

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'gs-order-move-btn';
    resetBtn.textContent = '🔄 Nối lại từ đầu';
    resetBtn.disabled = this.isQuestionAnswered || pairedCount === 0;
    resetBtn.addEventListener('click', () => {
      if (this.isQuestionAnswered) return;
      this.matchingPairs = {};
      this.matchingSelectedLeft = 0;
      this.interactiveWarningMsg = null;
      this.render();
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ CHỐT CẶP NỐI';
    submitBtn.disabled = this.isQuestionAnswered;
    const checkMatchAnswer = () => {
      if (this.isQuestionAnswered) return;
      if (pairedCount < q.left_items.length) {
        this.interactiveWarningMsg = `⚠️ Bạn mới nối ${pairedCount}/${q.left_items.length} cặp. Hãy nối đầy đủ cả 4 cặp giữa Vế A và Vế B trước khi chốt!`;
        sfx.playBuzzer();
        this.render();
        return;
      }

      this.stopQuestionTimer();
      this.interactiveWarningMsg = null;

      const correctCount = q.correct_pairs.filter((expectedRight, leftIdx) => this.matchingPairs[leftIdx] === expectedRight).length;
      const isCorrect = correctCount === q.left_items.length;
      const summaryPrefix = `Cặp nối đúng: ${q.correct_pairs.map((r, l) => `${l + 1} ↔ ${String.fromCharCode(65 + r)}`).join(' | ')}.`;
      this.finalizeInteractiveAnswer(q, isCorrect, onAnswer, onCompleteAfterToast, summaryPrefix);
    };
    this.attachThrottledSubmit(submitBtn, checkMatchAnswer);

    actionBtns.appendChild(resetBtn);
    actionBtns.appendChild(submitBtn);
    footerRow.appendChild(statusInfo);
    footerRow.appendChild(actionBtns);
    panel.appendChild(footerRow);

    const matchSummary = q.correct_pairs.map((r, l) => `${l + 1} ↔ ${String.fromCharCode(65 + r)}`).join('  |  ');
    this.appendPostAnswerFooter(panel, matchSummary, q.explanation);

    return panel;
  }

  // ==========================================================================
  // MULTIPLE-CHOICE 4 OPTIONS QUESTION CARD
  // ==========================================================================
  private renderQuestionCard(
    q: { question: string; options?: string[]; correct_index?: number; explanation?: string; has_card?: string | null; special_reward_title?: string; special_reward_message?: string },
    subtitle: string,
    onAnswer: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    if (this.activeStrategyNotice) {
      const noticeBanner = document.createElement('div');
      noticeBanner.className = 'gs-5s-notice-box';
      noticeBanner.textContent = this.activeStrategyNotice;
      panel.appendChild(noticeBanner);
    }

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = subtitle;

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = q.question;

    const optGrid = document.createElement('div');
    optGrid.className = 'gs-options-grid';

    const allOptionButtons: HTMLButtonElement[] = [];

    if (q.options && q.options.length) {
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `gs-option-btn ${this.isQuestionAnswered && idx === q.correct_index ? 'correct' : ''}`;
        btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
        btn.disabled = this.isQuestionAnswered;
        allOptionButtons.push(btn);

        btn.addEventListener('click', () => {
          if (this.isQuestionAnswered) return;
          const now = Date.now();
          if (now - this.lastSubmitTime < 1000) return;
          this.lastSubmitTime = now;
          this.stopQuestionTimer();

          allOptionButtons.forEach((b) => {
            b.disabled = true;
          });

          const isCorrect = idx === q.correct_index;
          if (isCorrect) {
            btn.classList.add('correct');
          } else {
            btn.classList.add('incorrect');
          }

          const correctLetter = typeof q.correct_index === 'number' ? String.fromCharCode(65 + q.correct_index) : '';
          this.finalizeInteractiveAnswer(
            q,
            isCorrect,
            onAnswer,
            onCompleteAfterToast,
            correctLetter ? `Đáp án đúng là phương án ${correctLetter}.` : ''
          );
        });

        optGrid.appendChild(btn);
      });
    }

    panel.appendChild(theme);
    panel.appendChild(text);
    panel.appendChild(optGrid);

    const mcSummary =
      typeof q.correct_index === 'number' && q.options && q.options[q.correct_index]
        ? `${String.fromCharCode(65 + q.correct_index)}. ${q.options[q.correct_index]}`
        : '';
    this.appendPostAnswerFooter(panel, mcSummary, q.explanation);

    return panel;
  }

  // ==========================================================================
  // FILL-IN QUESTION CARD VỚI HÀNG Ô CHỮ GỢI Ý TIẾN TRÌNH THEO SỐ LẦN SAI
  // ==========================================================================
  private renderFillInQuestionCard(
    q: { question: string; correct_answer?: string; explanation?: string; has_card?: string | null },
    subtitle = 'ĐIỀN KHUYẾT TỪ KHÓA (+20 / -10 ĐIỂM)',
    onAnswer?: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel gs-fillin-card-panel';

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = subtitle;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = q.question;
    panel.appendChild(text);

    // Xử lý gợi ý ô chữ tiến trình:
    // - Lần sai 1: Hiện 1 hàng ô chữ giống trong minigame 2 (hiển thị số lượng từ và ký tự)
    // - Lần sai 2: Mở chữ cái đầu tiên của mỗi từ trong đáp án
    // - Lần sai 3 trở đi: Mở thêm chữ cái ngẫu nhiên của mỗi từ trong đáp án
    const rawAnswer = (q.correct_answer || '').trim();
    const words = rawAnswer.split(/\s+/).filter(Boolean);
    const totalLetters = rawAnswer.replace(/\s+/g, '').length;
    const wrongCount = Math.max(this.failedTeamIdsOnQuestion.size, this.questionWrongAttemptCount);

    if (wrongCount >= 1 || this.isQuestionAnswered) {
      const hintBox = document.createElement('div');
      hintBox.className = 'gs-fill-hint-box';

      const hintHeader = document.createElement('div');
      hintHeader.className = 'gs-fill-hint-header';
      if (this.isQuestionAnswered) {
        hintHeader.innerHTML = `✅ <strong>ĐÁP ÁN CHÍNH XÁC:</strong> ${words.length} TỪ · ${totalLetters} KÝ TỰ`;
      } else if (wrongCount === 1) {
        hintHeader.innerHTML = `💡 <strong>GỢI Ý LẦN 1:</strong> ĐÁP ÁN GỒM <strong>${words.length} TỪ</strong> (${totalLetters} KÝ TỰ)`;
      } else if (wrongCount === 2) {
        hintHeader.innerHTML = `💡 <strong>GỢI Ý LẦN 2:</strong> ĐÃ MỞ CHỮ CÁI ĐẦU TIÊN CỦA MỖI TỪ!`;
      } else {
        hintHeader.innerHTML = `💡 <strong>GỢI Ý LẦN ${wrongCount}:</strong> ĐÃ MỞ THÊM CHỮ CÁI NGẪU NHIÊN CỦA MỖI TỪ!`;
      }
      hintBox.appendChild(hintHeader);

      const hintTrack = document.createElement('div');
      hintTrack.className = 'gs-fill-hint-track';

      words.forEach((w, wIdx) => {
        const wGroup = document.createElement('div');
        wGroup.className = 'gs-word-group';

        const chars = Array.from(w);
        chars.forEach((ch, cIdx) => {
          const slot = document.createElement('div');
          let revealed = this.isQuestionAnswered;
          if (!revealed && wrongCount >= 2 && cIdx === 0) {
            revealed = true; // Chữ cái đầu tiên của mỗi từ
          }
          if (!revealed && wrongCount >= 3 && chars.length > 1) {
            // Chữ cái ngẫu nhiên nhưng ổn định (deterministic)
            const pseudoRand = ((this.currentQuestionIndex * 19 + wIdx * 11 + 5) % (chars.length - 1)) + 1;
            if (cIdx === pseudoRand) {
              revealed = true;
            }
          }

          slot.className = `gs-cw-preview-slot ${revealed ? 'revealed' : ''}`;
          slot.textContent = revealed ? ch.toUpperCase() : '';
          wGroup.appendChild(slot);
        });

        hintTrack.appendChild(wGroup);
      });

      hintBox.appendChild(hintTrack);
      panel.appendChild(hintBox);
    } else {
      const tipBox = document.createElement('div');
      tipBox.className = 'gs-fill-hint-placeholder';
      tipBox.innerHTML = `💡 <em>Gợi ý hàng ô chữ sẽ tự động mở sau lần trả lời sai đầu tiên để trợ giúp các nhóm!</em>`;
      panel.appendChild(tipBox);
    }

    const inputRow = document.createElement('div');
    inputRow.className = 'gs-fillin-row';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];

    const input = document.createElement('input');
    input.type = 'text';
    input.className = `gs-fillin-input ${this.isQuestionAnswered ? 'correct' : ''}`;
    input.placeholder = `Người phụ trách gõ câu trả lời cho [${currentTeam.name}] tại đây...`;
    if (this.isQuestionAnswered && q.correct_answer) {
      input.value = q.correct_answer;
    }
    input.disabled = this.isQuestionAnswered;

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ KIỂM TRA ĐÁP ÁN';
    submitBtn.disabled = this.isQuestionAnswered;

    const checkAnswer = () => {
      if (this.isQuestionAnswered) return;
      const rawVal = input.value.trim();
      if (!rawVal) {
        input.focus();
        return;
      }

      this.stopQuestionTimer();
      input.disabled = true;
      submitBtn.disabled = true;

      const typed = normalizeVietnamese(rawVal);
      const standard = normalizeVietnamese(q.correct_answer || '');
      const isCorrect = typed === standard || (standard.length > 0 && typed.includes(standard));

      if (isCorrect) {
        input.classList.add('correct');
      } else {
        input.classList.add('incorrect');
      }

      const handleScoring = onAnswer || ((correct: boolean) => {
        gameshow.modifyScore(currentTeam.id, correct ? +20 : -10, correct ? 'Điền khuyết đúng' : 'Điền khuyết sai');
      });

      this.finalizeInteractiveAnswer(
        q,
        isCorrect,
        handleScoring,
        onCompleteAfterToast,
        `Đáp án chính xác: "${q.correct_answer}".`
      );
    };

    this.attachThrottledSubmit(submitBtn, checkAnswer, input);

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);
    panel.appendChild(inputRow);

    this.appendPostAnswerFooter(panel, q.correct_answer || '', q.explanation);

    return panel;
  }

  // ==========================================================================
  // ROUND NAVIGATION & COMPLETION (Thu thập Chìa Khóa)
  // ==========================================================================
  private createRoundNav(
    totalQuestions: number,
    stationId: string,
    stationName: string
  ): HTMLElement {
    const nav = document.createElement('div');
    nav.className = 'gs-round-nav-bar';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'gs-nav-btn prev';
    prevBtn.textContent = '⬅ CÂU TRƯỚC';
    prevBtn.disabled = this.currentQuestionIndex === 0;
    prevBtn.addEventListener('click', () => {
      if (this.currentQuestionIndex > 0) {
        this.clearActiveToast();
        this.stopQuestionTimer();
        this.currentQuestionIndex--;
        this.isQuestionRevealed = false;
        this.resetCurrentQuestionAttemptState();
        this.render();
      }
    });

    const indicator = document.createElement('span');
    indicator.className = 'gs-nav-indicator';
    indicator.textContent = `CÂU HỎI ${this.currentQuestionIndex + 1} / ${totalQuestions}`;

    const nextBtn = document.createElement('button');
    nextBtn.className = 'gs-nav-btn next';
    nextBtn.textContent = 'CÂU TIẾP THEO ➡';
    nextBtn.disabled = this.currentQuestionIndex >= totalQuestions - 1;
    nextBtn.addEventListener('click', () => {
      if (this.currentQuestionIndex < totalQuestions - 1) {
        this.clearActiveToast();
        this.stopQuestionTimer();
        this.currentQuestionIndex++;
        this.isQuestionRevealed = false;
        this.resetCurrentQuestionAttemptState();
        this.render();
      }
    });

    const isCompleted = gameshow.isStationCompleted(stationId);
    const completeBtn = document.createElement('button');
    completeBtn.className = `gs-nav-complete-btn ${isCompleted ? 'done' : ''}`;
    completeBtn.textContent = isCompleted
      ? '✅ ĐÃ NHẬN CHÌA KHÓA VÒNG NÀY'
      : '🏁 HOÀN THÀNH VÒNG & NHẬN CHÌA KHÓA 🗝️';
    completeBtn.addEventListener('click', () => {
      this.finishCurrentStation(stationId, stationName);
    });

    nav.appendChild(prevBtn);
    nav.appendChild(indicator);
    nav.appendChild(nextBtn);
    nav.appendChild(completeBtn);

    return nav;
  }

  // ==========================================================================
  // CARD AWARD CELEBRATION TOAST
  // ==========================================================================
  private showCardAwardToast(
    teamName: string,
    cardType: FunctionalCardType,
    onDismiss?: () => void
  ) {
    this.clearActiveToast();

    const toast = document.createElement('div');
    toast.className = 'gs-score-toast gs-card-award-toast';

    let cardTitle = '';
    let cardIcon = '';
    let cardDesc = '';
    let cardColor = '';

    if (cardType === 'steal_points') {
      cardIcon = '⚡';
      cardTitle = 'THẺ CƯỚP ĐIỂM';
      cardDesc = 'Rút trực tiếp 20 điểm từ 1 đội bất kỳ chuyển về quỹ điểm của đội mình.';
      cardColor = '#f39c12';
    } else if (cardType === 'block_turn') {
      cardIcon = '🔒';
      cardTitle = 'THẺ CẤM LƯỢT';
      cardDesc = 'Khóa quyền trả lời của 1 đội đối thủ ở câu hỏi kế tiếp.';
      cardColor = '#e74c3c';
    } else if (cardType === 'shield') {
      cardIcon = '🛡️';
      cardTitle = 'THẺ KHIÊN BẢO VỆ';
      cardDesc = 'Vô hiệu hóa 1 đòn tấn công từ đội khác (Chống bị cướp điểm hoặc chống bị cấm lượt).';
      cardColor = '#2ecc71';
    }

    toast.innerHTML = `
      <div class="gs-card-award-card" style="border-color:${cardColor}">
        <div class="gs-card-award-crown">🎁 BẤT NGỜ MỞ KHÓA THẺ CHỨC NĂNG! 🎁</div>
        <div class="gs-card-award-icon">${cardIcon}</div>
        <div class="gs-card-award-type" style="color:${cardColor}">${cardTitle}</div>
        <div class="gs-card-award-winner">Trao cho: <strong>${teamName}</strong> (+20 điểm & Thẻ)</div>
        <div class="gs-card-award-desc">${cardDesc}</div>
      </div>
      <div class="gs-toast-progress-bar"></div>
      <div class="gs-result-timer">⏳ Click bất kỳ đâu để tiếp tục ngay</div>
    `;

    sfx.playCardAwardFanfare();

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (this.toastTimeout !== null) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      toast.remove();
      if (onDismiss) onDismiss();
    };

    toast.addEventListener('click', dismiss);
    this.modalContainer.appendChild(toast);

    this.toastTimeout = window.setTimeout(() => {
      dismiss();
    }, 4000);
  }

  private finishCurrentStation(stationId: string, stationName: string) {
    this.stopQuestionTimer();
    const isNew = gameshow.markStationCompleted(stationId);
    sfx.playGong();
    sfx.playSuccess();
    const totalKeys = gameshow.getCollectedKeysCount();

    if (totalKeys >= 4) {
      this.showDrumUnsealedCelebrationToast(stationName);
      return;
    }

    this.showQuadrantUnlockedCelebration(stationId, stationName, isNew);
  }

  private renderTrongDongQuadrantsHtml(highlightStationId?: string, size = 250): string {
    const q1 = gameshow.isStationCompleted('M01');
    const q2 = gameshow.isStationCompleted('M02');
    const q3 = gameshow.isStationCompleted('M03');
    const q4 = gameshow.isStationCompleted('M04');
    const allUnlocked = gameshow.hasAllKeys();

    return `
      <div class="gs-trongdong-quadrants-wrap">
        <div class="gs-trongdong-quadrants-circle ${allUnlocked ? 'all-unlocked' : ''}" style="width:${size}px; height:${size}px;">
          <!-- Cung 1 (Top-Right): M01 -->
          <div class="gs-trongdong-quadrant q1 ${q1 ? 'lit' : 'sealed'} ${highlightStationId === 'M01' ? 'highlight' : ''}">
            <img src="assets/sprites/trong_dong_dong_son.svg" class="gs-trongdong-img" alt="Cung I" />
            <div class="gs-trongdong-quadrant-mask">
              <span class="gs-quadrant-tag">${q1 ? '✨ CUNG I' : '🔒 CUNG I'}</span>
            </div>
          </div>
          <!-- Cung 2 (Bottom-Right): M02 -->
          <div class="gs-trongdong-quadrant q2 ${q2 ? 'lit' : 'sealed'} ${highlightStationId === 'M02' ? 'highlight' : ''}">
            <img src="assets/sprites/trong_dong_dong_son.svg" class="gs-trongdong-img" alt="Cung II" />
            <div class="gs-trongdong-quadrant-mask">
              <span class="gs-quadrant-tag">${q2 ? '✨ CUNG II' : '🔒 CUNG II'}</span>
            </div>
          </div>
          <!-- Cung 3 (Bottom-Left): M03 -->
          <div class="gs-trongdong-quadrant q3 ${q3 ? 'lit' : 'sealed'} ${highlightStationId === 'M03' ? 'highlight' : ''}">
            <img src="assets/sprites/trong_dong_dong_son.svg" class="gs-trongdong-img" alt="Cung III" />
            <div class="gs-trongdong-quadrant-mask">
              <span class="gs-quadrant-tag">${q3 ? '✨ CUNG III' : '🔒 CUNG III'}</span>
            </div>
          </div>
          <!-- Cung 4 (Top-Left): M04 -->
          <div class="gs-trongdong-quadrant q4 ${q4 ? 'lit' : 'sealed'} ${highlightStationId === 'M04' ? 'highlight' : ''}">
            <img src="assets/sprites/trong_dong_dong_son.svg" class="gs-trongdong-img" alt="Cung IV" />
            <div class="gs-trongdong-quadrant-mask">
              <span class="gs-quadrant-tag">${q4 ? '✨ CUNG IV' : '🔒 CUNG IV'}</span>
            </div>
          </div>
          <div class="gs-trongdong-divider-h"></div>
          <div class="gs-trongdong-divider-v"></div>
          <div class="gs-trongdong-sun-core ${allUnlocked ? 'shining' : ''}"></div>
        </div>
        <div class="gs-trongdong-legend">
          <div class="gs-legend-item ${q1 ? 'lit' : 'sealed'}"><span>${q1 ? '☀️' : '🔒'}</span> Cung I: Thổ Cẩm (${q1 ? 'ĐÃ SÁNG' : 'PHONG ẤN'})</div>
          <div class="gs-legend-item ${q2 ? 'lit' : 'sealed'}"><span>${q2 ? '☀️' : '🔒'}</span> Cung II: Phiên Chợ (${q2 ? 'ĐÃ SÁNG' : 'PHONG ẤN'})</div>
          <div class="gs-legend-item ${q3 ? 'lit' : 'sealed'}"><span>${q3 ? '☀️' : '🔒'}</span> Cung III: Cồng Chiêng (${q3 ? 'ĐÃ SÁNG' : 'PHONG ẤN'})</div>
          <div class="gs-legend-item ${q4 ? 'lit' : 'sealed'}"><span>${q4 ? '☀️' : '🔒'}</span> Cung IV: Lửa Thiêng (${q4 ? 'ĐÃ SÁNG' : 'PHONG ẤN'})</div>
        </div>
      </div>
    `;
  }

  private showQuadrantUnlockedCelebration(stationId: string, stationName: string, isNew: boolean) {
    this.clearActiveToast();

    const themes: Record<string, { accent: string; deep: string }> = {
      M01: { accent: '#a63d2f', deep: '#7e2c21' },
      M02: { accent: '#4f6b3a', deep: '#38502a' },
      M03: { accent: '#2f4a6b', deep: '#223750' },
      M04: { accent: '#b5562a', deep: '#8a3f1c' },
    };
    const theme = themes[stationId] || themes.M01;
    const quad = gameshow.getStationQuadrant(stationId);
    const totalKeys = gameshow.getCollectedKeysCount();

    const toast = document.createElement('div');
    toast.className = 'gs-score-toast gs-key-toast';
    toast.style.setProperty('--key-accent', theme.accent);
    toast.style.setProperty('--key-deep', theme.deep);

    const card = document.createElement('div');
    card.className = 'gs-key-card';
    card.innerHTML = `
      <div class="gs-key-icon">🗝️</div>
      <div class="gs-key-title">${isNew ? 'ĐÃ NHẬN CHÌA KHÓA' : 'ĐÃ CÓ CHÌA KHÓA'} VÒNG ${quad?.index || 1}</div>
      <div class="gs-key-station">${stationName}</div>
      <div class="gs-key-count">Chìa khóa thu thập: ${totalKeys}/4</div>
    `;

    const actionWrap = document.createElement('div');
    actionWrap.className = 'gs-key-actions';

    const goHubBtn = document.createElement('button');
    goHubBtn.type = 'button';
    goHubBtn.className = 'gs-key-btn primary';
    goHubBtn.textContent = '🗺️ Về bản đồ';
    goHubBtn.onclick = (ev) => {
      ev.stopPropagation();
      dismiss(false);
      this.close();
    };

    const stayBtn = document.createElement('button');
    stayBtn.type = 'button';
    stayBtn.className = 'gs-key-btn';
    stayBtn.textContent = 'Tiếp tục';
    stayBtn.onclick = (ev) => {
      ev.stopPropagation();
      dismiss(true);
    };

    actionWrap.appendChild(goHubBtn);
    actionWrap.appendChild(stayBtn);
    card.appendChild(actionWrap);
    toast.appendChild(card);

    let dismissed = false;
    const dismiss = (rerender: boolean) => {
      if (dismissed) return;
      dismissed = true;
      if (this.toastTimeout !== null) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      toast.remove();
      if (rerender) this.render();
    };

    toast.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).tagName === 'BUTTON') return;
      dismiss(true);
    });

    this.modalContainer.appendChild(toast);
    this.toastTimeout = window.setTimeout(() => dismiss(true), 12000);
  }

  private showDrumUnsealedCelebrationToast(stationName?: string) {
    this.clearActiveToast();

    const toast = document.createElement('div');
    toast.className = 'gs-score-toast gs-drum-unlock-toast';

    const headerBadge = document.createElement('div');
    headerBadge.className = 'gs-drum-unlock-badge';
    headerBadge.textContent = '🔑 ĐÃ THU THẬP ĐỦ 4/4 CHÌA KHÓA VĂN HÓA!';

    const drumVisualWrap = document.createElement('div');
    drumVisualWrap.className = 'gs-drum-unlock-visual';
    drumVisualWrap.innerHTML = this.renderTrongDongQuadrantsHtml(undefined, 250);

    const title = document.createElement('div');
    title.className = 'gs-result-team-name';
    title.textContent = '✨ MỞ KHÓA HÌNH ẢNH TRỐNG ĐỒNG ĐÔNG SƠN ✨';

    const exp = document.createElement('div');
    exp.className = 'gs-result-explanation';
    exp.textContent = stationName
      ? `Chúc mừng các đội đã hoàn thành [${stationName}] và thu thập trọn vẹn 4/4 Chìa Khóa! Phong ấn đã được phá giải, Hình ảnh Trống Đồng Đông Sơn Hoàng Kim đã chính thức hiện diện rực rỡ tại trung tâm Bản đồ Lễ Hội!`
      : 'Phong ấn 4 phương đã được phá giải! Hình ảnh Trống Đồng Đông Sơn Hoàng Kim đã chính thức được mở khóa và tỏa sáng rực rỡ tại Quảng trường Trung tâm!';

    const actionWrap = document.createElement('div');
    actionWrap.className = 'gs-drum-unlock-actions';

    const goHubBtn = document.createElement('button');
    goHubBtn.className = 'gs-victory-btn primary';
    goHubBtn.textContent = '🗺️ Về Bản Đồ Ngắm Trống Đồng & Vào Đại Kết Cục';
    goHubBtn.onclick = (e) => {
      e.stopPropagation();
      dismiss();
      this.close();
    };

    const stayBtn = document.createElement('button');
    stayBtn.className = 'gs-victory-btn secondary';
    stayBtn.textContent = '✨ Tiếp tục xem kết quả vòng này';
    stayBtn.onclick = (e) => {
      e.stopPropagation();
      dismiss();
    };

    actionWrap.appendChild(goHubBtn);
    actionWrap.appendChild(stayBtn);

    toast.appendChild(headerBadge);
    toast.appendChild(drumVisualWrap);
    toast.appendChild(title);
    toast.appendChild(exp);
    toast.appendChild(actionWrap);

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (this.toastTimeout !== null) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      toast.remove();
      this.render();
    };

    this.modalContainer.appendChild(toast);
  }

  // ==========================================================================
  // FLOATING SCORE TOAST
  // ==========================================================================
  private showScoreToast(
    teamName: string,
    delta: number,
    explanation: string,
    durationMs = 3500,
    onDismiss?: () => void
  ) {
    this.clearActiveToast();

    const toast = document.createElement('div');
    toast.className = 'gs-score-toast';

    const scoreNum = document.createElement('div');
    scoreNum.className = `gs-floating-score ${delta > 0 ? 'plus' : (delta < 0 ? 'minus' : 'neutral')}`;
    scoreNum.textContent = delta > 0 ? `+${delta}` : (delta < 0 ? `${delta}` : '✨');

    const title = document.createElement('div');
    title.className = 'gs-result-team-name';
    title.textContent = teamName;

    const exp = document.createElement('div');
    exp.className = 'gs-result-explanation';
    exp.textContent = explanation;

    const progressBar = document.createElement('div');
    progressBar.className = 'gs-toast-progress-bar';

    const hint = document.createElement('div');
    hint.className = 'gs-result-timer';
    hint.textContent = '⏳ Click bất kỳ đâu để tiếp tục ngay';

    toast.appendChild(scoreNum);
    toast.appendChild(title);
    toast.appendChild(exp);
    toast.appendChild(progressBar);
    toast.appendChild(hint);

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (this.toastTimeout !== null) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      toast.remove();
      if (onDismiss) onDismiss();
    };

    toast.addEventListener('click', dismiss);
    this.modalContainer.appendChild(toast);

    this.toastTimeout = window.setTimeout(() => {
      dismiss();
    }, durationMs);
  }
}
