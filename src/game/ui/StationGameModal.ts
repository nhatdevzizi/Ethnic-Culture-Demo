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

  // Rounds 2-4 & Finale State: Ban đầu ẩn câu hỏi để chọn cược / đuốc / chuẩn bị, bấm nút mới mở câu hỏi
  private isQuestionRevealed = false;
  private isGrandFinaleCelebration = false;

  // Round 2 Bids
  private r2Bids: Record<string, number> = {};

  // Round 3 Buzzers
  private r3BuzzedTeamId: string | null = null;
  private r3SecondBuzzedTeamId: string | null = null;

  // Round 4 Torches
  private r4Torches: Record<string, 'silver' | 'gold' | null> = {};

  // 20s Question Timer & Lock State
  private static readonly QUESTION_TIME_LIMIT = 20;
  private questionSecondsLeft = StationGameModal.QUESTION_TIME_LIMIT;
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
    this.isQuestionRevealed = false;
    this.isQuestionAnswered = false;
    this.isGrandFinaleCelebration = stationId === 'board' && gameshow.isStationCompleted('board');
    this.cardTargetPicker = null;
    this.activeStrategyNotice = null;
    this.r3BuzzedTeamId = null;
    this.r3SecondBuzzedTeamId = null;
    this.currentQuestionIndex = 0;
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

  private startQuestionTimer() {
    this.stopQuestionTimer();
    this.isQuestionAnswered = false;
    this.questionSecondsLeft = StationGameModal.QUESTION_TIME_LIMIT;

    this.questionTimerInterval = window.setInterval(() => {
      if (this.isQuestionAnswered) {
        this.stopQuestionTimer();
        return;
      }
      this.questionSecondsLeft = Math.max(0, this.questionSecondsLeft - 1);
      this.updateTimerDOM();

      if (this.questionSecondsLeft > 0 && this.questionSecondsLeft <= 5) {
        sfx.playTick(this.questionSecondsLeft === 1 ? 1200 : 880);
      } else if (this.questionSecondsLeft <= 0) {
        this.handleQuestionTimeout();
      }
    }, 1000);
  }

  private stopQuestionTimer() {
    if (this.questionTimerInterval !== null) {
      clearInterval(this.questionTimerInterval);
      this.questionTimerInterval = null;
    }
  }

  private updateTimerDOM() {
    const numEl = this.modalContainer.querySelector('.gs-q-timer-seconds');
    if (numEl) {
      numEl.textContent = `${this.questionSecondsLeft}s`;
    }
    const badgeEl = this.modalContainer.querySelector('.gs-q-timer-badge');
    if (badgeEl) {
      badgeEl.classList.toggle('urgent', this.questionSecondsLeft <= 5);
    }
    const fillEl = this.modalContainer.querySelector('.gs-q-timer-bar-fill') as HTMLElement | null;
    if (fillEl) {
      const pct = Math.max(0, (this.questionSecondsLeft / StationGameModal.QUESTION_TIME_LIMIT) * 100);
      fillEl.style.width = `${pct}%`;
      fillEl.classList.toggle('urgent', this.questionSecondsLeft <= 5);
    }
  }

  private handleQuestionTimeout() {
    if (this.isQuestionAnswered) return;
    this.isQuestionAnswered = true;
    this.stopQuestionTimer();

    // Lock all interactive inputs in the question panel
    this.modalContainer
      .querySelectorAll<HTMLButtonElement>('.gs-option-btn, .gs-fillin-submit-btn')
      .forEach((btn) => {
        btn.disabled = true;
      });
    this.modalContainer
      .querySelectorAll<HTMLInputElement>('.gs-fillin-input')
      .forEach((inp) => {
        inp.disabled = true;
      });

    sfx.playFailure();
    const currentTeam = gameshow.teams[this.selectedTeamIndex];
    gameshow.consumeBlockedTurns();

    this.showScoreToast(
      currentTeam.name,
      0,
      '⏰ HẾT THỜI GIAN (20 GIÂY)! Lượt trả lời câu hỏi này đã khép lại.',
      3000,
      () => {
        if (this.activeStationId === 'M01') {
          this.r1ActiveTileQuestion = false;
        }
        this.render();
      }
    );
  }

  private createTimerHeaderWidget(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'gs-q-timer-wrap';

    const pct = Math.max(0, (this.questionSecondsLeft / StationGameModal.QUESTION_TIME_LIMIT) * 100);
    const isUrgent = this.questionSecondsLeft <= 5;

    wrap.innerHTML = `
      <div class="gs-q-timer-row">
        <span class="gs-q-timer-label">⏱️ THỜI GIAN SUY NGHĨ & TRẢ LỜI:</span>
        <span class="gs-q-timer-badge ${isUrgent ? 'urgent' : ''}">
          <strong class="gs-q-timer-seconds">${this.questionSecondsLeft}s</strong> / ${StationGameModal.QUESTION_TIME_LIMIT}s
        </span>
      </div>
      <div class="gs-q-timer-bar">
        <div class="gs-q-timer-bar-fill ${isUrgent ? 'urgent' : ''}" style="width: ${pct}%"></div>
      </div>
    `;
    return wrap;
  }

  render() {
    this.modalContainer.innerHTML = '';

    const dialog = document.createElement('div');
    dialog.className = 'gs-station-dialog';

    // 1. Top Header with Back Button and Station Name
    const topBar = document.createElement('div');
    topBar.className = 'gs-station-topbar';

    const titleBox = document.createElement('div');
    titleBox.className = 'gs-station-title-box';

    let stationTitle = '';
    let stationSubtitle = '';
    if (this.activeStationId === 'M01') {
      stationTitle = '🏮 LÁN TRẠI 1: MẢNH GHÉP THỔ CẨM';
      stationSubtitle = 'Bấm chọn ô số 1–9 để mở câu hỏi (20s/câu) và giải mã Bức tranh bí ẩn';
    } else if (this.activeStationId === 'M02') {
      stationTitle = '🎪 LÁN TRẠI 2: PHIÊN CHỢ VÙNG CAO';
      stationSubtitle = 'Xem Chủ đề → Chọn mức cược 10–30 điểm → Bấm Mở câu hỏi (20s)';
    } else if (this.activeStationId === 'M03') {
      stationTitle = '🎵 LÁN TRẠI 3: TIẾNG VANG ĐẠI NGÀN';
      stationSubtitle = 'Chuông phản xạ, nhận diện âm thanh nhạc cụ và điền khuyết ca dao (20s)';
    } else if (this.activeStationId === 'M04') {
      stationTitle = '🔥 LÁN TRẠI 4: LỬA THIÊNG ĐẠI NGÀN';
      stationSubtitle = 'Xem Độ khó → Chọn Đuốc Bạc (x2) / Đuốc Vàng (x3) → Bấm Mở câu hỏi (20s)';
    } else {
      stationTitle = '🏛️ ĐẠI KẾT CỤC: ĐẠI ĐOÀN KẾT 54 DÂN TỘC';
      stationSubtitle = 'Bức Tranh Đại Đoàn Kết & Thử thách danh dự cá nhân';
    }

    const h2 = document.createElement('h2');
    h2.textContent = stationTitle;
    const sub = document.createElement('span');
    sub.textContent = stationSubtitle;
    titleBox.appendChild(h2);
    titleBox.appendChild(sub);
    topBar.appendChild(titleBox);

    // Key status indicators on topBar
    const keyStatusBox = document.createElement('div');
    keyStatusBox.className = 'gs-station-keys-indicator';
    const totalKeys = gameshow.getCollectedKeysCount();
    const isThisCompleted = this.activeStationId !== 'board' && gameshow.isStationCompleted(this.activeStationId);
    const isBoardCompleted = gameshow.isStationCompleted('board');
    keyStatusBox.innerHTML = `
      <div class="gs-key-pill ${totalKeys >= 4 ? 'gold' : ''}">🗝️ Chìa Khóa: ${totalKeys}/4</div>
      ${this.activeStationId !== 'board' ? `
        <div class="gs-round-status-tag ${isThisCompleted ? 'completed' : 'pending'}">
          ${isThisCompleted ? '✅ ĐÃ NHẬN CHÌA KHÓA' : '🔒 CHƯA HOÀN THÀNH'}
        </div>
      ` : `
        <div class="gs-round-status-tag ${isBoardCompleted ? 'completed' : (totalKeys >= 4 ? 'completed' : 'pending')}">
          ${isBoardCompleted ? '🏆 ĐÃ HOÀN THÀNH ĐẠI KẾT CỤC' : (totalKeys >= 4 ? '✨ ĐÃ MỞ PHONG ẤN' : '🔒 ĐANG BỊ PHONG ẤN')}
        </div>
      `}
    `;
    topBar.appendChild(keyStatusBox);

    const backBtn = document.createElement('button');
    backBtn.className = 'gs-btn-back-hub';
    backBtn.textContent = '🚶 VỀ BẢN ĐỒ HUB';
    backBtn.addEventListener('click', () => this.close());
    topBar.appendChild(backBtn);

    dialog.appendChild(topBar);

    // 2. Team Selector Bar (Chọn Nhóm trả lời & kích hoạt thẻ chức năng)
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
  // TEAM SELECTOR BAR (Click chọn Nhóm trả lời câu hỏi & dùng thẻ)
  // ==========================================================================
  private createTeamSelectorBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'gs-team-selector-bar';

    const label = document.createElement('div');
    label.className = 'gs-selector-label';
    label.innerHTML = `CHỌN ĐỘI TRẢ LỜI:`;
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
      const isBlocked = team.isBlockedNextQuestion;
      btn.className = `gs-selector-team-btn ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''}`;
      btn.style.borderColor = team.color;

      btn.innerHTML = `
        <span class="gs-st-name">${isSelected ? '☑️' : '⬜'} ${team.name} ${isBlocked ? '🔒 (CẤM LƯỢT)' : ''}</span>
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
          ? '🎯 Chọn đội để rút 20đ:'
          : '🎯 Chọn đội để cấm lượt:';
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

    bar.appendChild(row);
    return bar;
  }

  // ==========================================================================
  // ROUND 1: MẢNH GHÉP THỔ CẨM
  // ==========================================================================
  private renderRound1(): HTMLElement {
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
      const isCurrentSelected = !this.isGuessingSecretPainting && this.r1ActiveTileQuestion && i === this.currentQuestionIndex;
      tile.className = `gs-mosaic-tile ${isOpened ? 'opened' : ''} ${isCurrentSelected ? 'selected-tile' : ''}`;

      const num = document.createElement('div');
      num.className = 'gs-tile-number';
      num.textContent = String(i + 1);
      tile.appendChild(num);

      const q = r1Data.questions[i];
      if (!isOpened && q && q.has_card) {
        const badge = document.createElement('span');
        badge.className = 'gs-tile-badge';
        badge.textContent = '⭐PHIẾU';
        tile.appendChild(badge);
      }

      tile.addEventListener('click', () => {
        if (!isOpened) {
          this.clearActiveToast();
          this.isGuessingSecretPainting = false;
          this.currentQuestionIndex = i;
          this.r1ActiveTileQuestion = true;
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

    // Right: Secret Painting Guess Form OR Question Panel
    // Từ khóa chỉ hiển thị khi có 1 đội đoán đúng hoặc cả 4 đội đều đã đoán sai!
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
        ? '📢 CẢ 4 ĐỘI ĐỀU ĐÃ ĐOÁN SAI · LỘ DIỆN TỪ KHÓA BỨC TRANH!'
        : '🎉 ĐÃ GIẢI MÃ THÀNH CÔNG BỨC TRANH TỔNG THỂ!';
      rightCol.innerHTML = `
        <div class="gs-q-theme">${headerStatus}</div>
        <div class="gs-q-text" style="text-align:center; padding: 20px 15px;">
          <p style="font-size: 24px; color: var(--gs-gold); font-weight:800; margin-bottom: 12px;">
            🔑 Từ khóa bức tranh: ${r1Data.secret_title}
          </p>
          <p style="font-size: 16px; color: var(--gs-text-sub); line-height: 1.6;">
            ${r1Data.secret_description}
          </p>
        </div>
      `;
    } else {
      const q = r1Data.questions[this.currentQuestionIndex];
      const isCurrentOpened = gameshow.r1OpenedTiles[this.currentQuestionIndex];
      const allOpened = gameshow.r1OpenedTiles.every(Boolean);

      if (allOpened) {
        rightCol = document.createElement('div');
        rightCol.className = 'gs-question-panel gs-r1-prompt-panel';
        rightCol.innerHTML = `
          <div class="gs-q-theme">🖼️ ĐÃ LẬT MỞ TOÀN BỘ 9 MẢNH GHÉP! (TỪ KHÓA ĐANG ẨN)</div>
          <div class="gs-q-text" style="text-align:center; padding: 22px 15px;">
            <p style="font-size: 21px; color: var(--gs-gold); font-weight:800; margin-bottom: 12px;">
              Bức tranh đã lộ diện hoàn toàn! Nhưng từ khóa vẫn đang được giữ kín.
            </p>
            <p style="font-size: 15.5px; color: var(--gs-text-sub); line-height: 1.65;">
              👉 Hãy bấm nút <strong>"🔔 ĐOÁN BỨC TRANH TỔNG THỂ"</strong> bên trái để các đội nhập đáp án.<br>
              • Từ khóa đáp án sẽ chỉ hiển thị sau khi <strong>có 1 đội đoán đúng</strong> hoặc <strong>cả 4 đội đều đoán sai</strong>!
            </p>
          </div>
        `;
      } else if (isCurrentOpened || !this.r1ActiveTileQuestion) {
        rightCol = document.createElement('div');
        rightCol.className = 'gs-question-panel gs-r1-prompt-panel';
        rightCol.innerHTML = `
          <div class="gs-q-theme">🎯 CHƯA MỞ CÂU HỎI · MỜI CHỌN MẢNH GHÉP</div>
          <div class="gs-q-text" style="text-align:center; padding: 25px 15px;">
            <p style="font-size: 21px; color: var(--gs-gold); font-weight:800; margin-bottom: 14px;">
              👉 BẤM VÀO MỘT Ô SỐ (1 – 9) BÊN TRÁI ĐỂ HIỂN THỊ CÂU HỎI!
            </p>
            <p style="font-size: 15px; color: var(--gs-text-sub); line-height: 1.65;">
              • Câu hỏi đang được ẩn cho đến khi bạn bấm chọn mảnh ghép.<br>
              • Khi mở mảnh ghép, đội trả lời sẽ có <strong>20 giây</strong> để chọn đáp án (+10đ nếu đúng, -10đ nếu sai).<br>
              • Bất cứ lúc nào cũng có thể bấm <strong>"🔔 ĐOÁN BỨC TRANH TỔNG THỂ"</strong> bên trái để nhập từ khóa giải mã bức tranh (không giới hạn thời gian).
            </p>
          </div>
        `;
      } else {
        rightCol = this.renderQuestionCard(
          q,
          `MẢNH GHÉP SỐ ${this.currentQuestionIndex + 1} / 9`,
          (isCorrect) => {
            const currentTeam = gameshow.teams[this.selectedTeamIndex];
            if (isCorrect) {
              gameshow.r1OpenedTiles[this.currentQuestionIndex] = true;
              gameshow.r1AnsweredCount++;
              gameshow.modifyScore(currentTeam.id, +10, 'Trả lời đúng mảnh ghép');
            } else {
              gameshow.modifyScore(currentTeam.id, -10, 'Trả lời sai mảnh ghép');
            }
          },
          () => {
            this.r1ActiveTileQuestion = false;
            this.render();
          }
        );
      }
    }

    container.appendChild(rightCol);
    return container;
  }

  // ==========================================================================
  // ROUND 1 SECRET PAINTING FILL-IN GUESS CARD (Không giới hạn thời gian)
  // ==========================================================================
  private renderGuessSecretPaintingCard(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    // Nếu đội đang được chọn đã bị loại, tự động chuyển sang đội chưa bị loại đầu tiên (nếu còn)
    if (gameshow.teams[this.selectedTeamIndex]?.isEliminatedInRound1) {
      const availableIdx = gameshow.teams.findIndex((t) => !t.isEliminatedInRound1);
      if (availableIdx !== -1) {
        this.selectedTeamIndex = availableIdx;
      }
    }

    const points = gameshow.getRound1PictureGuessPoints();
    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = `🔔 ĐOÁN BỨC TRANH TỔNG THỂ (+${points} ĐIỂM NẾU ĐÚNG · KHÔNG GIỚI HẠN THỜI GIAN)`;
    panel.appendChild(theme);

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.style.fontSize = '19px';
    text.style.marginBottom = '14px';
    text.textContent = 'Tick chọn Đội đang trả lời và nhập từ khóa ngắn gọn của Bức tranh bí ẩn vào ô bên dưới (Từ khóa chỉ tiết lộ khi có 1 đội đoán đúng hoặc cả 4 đội đều đoán sai):';
    panel.appendChild(text);

    // Team tick selector right inside the card
    const teamTickBox = document.createElement('div');
    teamTickBox.className = 'gs-guess-team-tick-box';

    const tickLabel = document.createElement('div');
    tickLabel.className = 'gs-guess-team-tick-label';
    tickLabel.textContent = '1. TICK CHỌN ĐỘI ĐANG TRẢ LỜI:';
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
        <span>${team.name}${isEliminated ? ' (Đã đoán sai)' : ''}</span>
      `;
      tickBtn.addEventListener('click', () => {
        if (isEliminated || this.isQuestionAnswered) return;
        this.selectedTeamIndex = idx;
        sfx.playBuzzer();
        // Update tick UI in-place without losing input text
        this.modalContainer.querySelectorAll('.gs-guess-team-tick-btn').forEach((b, bIdx) => {
          const sel = bIdx === idx;
          b.classList.toggle('selected', sel);
          const icon = b.querySelector('.gs-tick-icon');
          if (icon) icon.textContent = sel ? '☑️' : '⬜';
        });
        this.modalContainer.querySelectorAll('.gs-selector-team-btn').forEach((b, bIdx) => {
          const sel = bIdx === idx;
          b.classList.toggle('selected', sel);
        });
        const inputEl = panel.querySelector<HTMLInputElement>('.gs-fillin-input');
        if (inputEl) {
          inputEl.placeholder = `Nhập từ khóa ngắn gọn cho [${team.name}]...`;
          inputEl.focus();
        }
      });
      tickGrid.appendChild(tickBtn);
    });

    teamTickBox.appendChild(tickGrid);
    panel.appendChild(teamTickBox);

    // Fill-in input row
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
      // Chấp nhận từ khóa ngắn gọn "cồng chiêng" hoặc "cồng chiêng tây nguyên"
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
            'CẢ 4 ĐỘI ĐỀU ĐÃ ĐOÁN SAI',
            0,
            `❌ Đáp án "${rawValue}" chưa chính xác!\nCả 4 đội đều đã hết lượt đoán. Từ khóa chính xác của bức tranh là: "${r1Data.secret_title}"!`,
            4500,
            () => {
              this.isGuessingSecretPainting = false;
              this.r1ActiveTileQuestion = false;
              this.render();
            }
          );
        } else {
          const remainingTeams = gameshow.teams.filter((t) => !t.isEliminatedInRound1).length;
          this.showScoreToast(
            answeringTeam.name,
            0,
            `❌ Đáp án "${rawValue}" chưa chính xác!\n${answeringTeam.name} đã mất quyền đoán Bức tranh tổng thể (Còn ${remainingTeams} đội có quyền đoán, từ khóa vẫn đang được giữ bí mật).`,
            3500,
            () => {
              this.isQuestionAnswered = false;
              // Tự động chuyển sang đội tiếp theo còn quyền đoán
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

    submitBtn.addEventListener('click', checkPaintingGuess);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkPaintingGuess();
      }
    });

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);
    panel.appendChild(inputRow);

    // Back to tile questions button
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
  // ROUND 2: PHIÊN CHỢ VÙNG CAO
  // ==========================================================================
  private renderRound2(): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const q = r2Data.questions[this.currentQuestionIndex % r2Data.questions.length];
    const currentTeam = gameshow.teams[this.selectedTeamIndex];
    const currentBid = this.r2Bids[currentTeam.id] || 10;

    // Inline Bidding Chips Bar
    const bidBox = document.createElement('div');
    bidBox.className = 'gs-r2-bid-box';
    bidBox.style.margin = '0 0 10px';
    bidBox.innerHTML = `<div>CHỦ ĐỀ CÂU HỎI ${this.currentQuestionIndex + 1}: <strong style="color:var(--gs-gold)">${q.theme}</strong> · CHỌN MỨC CƯỢC CHO <strong style="color:${currentTeam.color}">${currentTeam.name}</strong>:</div>`;

    const bidRow = document.createElement('div');
    bidRow.className = 'gs-bid-row';

    [10, 15, 20, 25, 30].forEach((amount) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `gs-bid-chip ${currentBid === amount ? 'active' : ''}`;
      chip.textContent = `${amount} điểm`;
      chip.disabled = this.isQuestionAnswered;
      chip.addEventListener('click', () => {
        if (this.isQuestionAnswered) return;
        this.r2Bids[currentTeam.id] = amount;
        sfx.playBuzzer();
        this.render();
      });
      bidRow.appendChild(chip);
    });

    bidBox.appendChild(bidRow);
    container.appendChild(bidBox);

    if (!this.isQuestionRevealed) {
      const promptPanel = this.createRevealQuestionPrompt(
        `CÂU ${this.currentQuestionIndex + 1}/${r2Data.questions.length} · CHỦ ĐỀ: ${q.theme}`,
        `1. Chọn Đội trả lời ở thanh trên cùng và chọn mức điểm cược (<strong>10 – 30 điểm</strong>) phù hợp với độ tự tin về chủ đề <strong>"${q.theme}"</strong>.<br>2. Trả lời ĐÚNG sẽ cộng đúng số điểm đã cược; trả lời SAI sẽ bị trừ số điểm đã cược.<br>3. Khi đã chốt mức cược, bấm nút bên dưới để mở câu hỏi và bắt đầu 20 giây trả lời!`
      );
      container.appendChild(promptPanel);
    } else {
      const qPanel = this.renderQuestionCard(
        q,
        `CHỦ ĐỀ: ${q.theme} · MỨC CƯỢC CỦA ${currentTeam.name}: ${currentBid} ĐIỂM`,
        (isCorrect) => {
          const delta = isCorrect ? currentBid : -currentBid;
          gameshow.modifyScore(currentTeam.id, delta, isCorrect ? 'Thắng điểm cược' : 'Thua điểm cược');
        }
      );
      container.appendChild(qPanel);
    }

    const nav = this.createRoundNav(r2Data.questions.length, 'M02', 'Vòng 2: Phiên Chợ Vùng Cao');
    container.appendChild(nav);

    return container;
  }

  // ==========================================================================
  // ROUND 3: TIẾNG VANG ĐẠI NGÀN (Audio & Fill-in text input)
  // ==========================================================================
  private renderRound3(): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const q = r3Data.questions[this.currentQuestionIndex % r3Data.questions.length];

    if (!this.isQuestionRevealed) {
      const qTypeLabel = q.type === 'audio' ? 'NHẬN DIỆN ÂM THANH NHẠC CỤ' : 'ĐIỀN KHUYẾT CA DAO TỤC NGỮ';
      const promptPanel = this.createRevealQuestionPrompt(
        `CÂU ${this.currentQuestionIndex + 1}/${r3Data.questions.length} · ${qTypeLabel}`,
        `Các đội chuẩn bị tinh thần bấm chuông giành quyền trả lời (+20 điểm nếu đúng, -10 điểm nếu sai).<br>Khi các đội đã sẵn sàng, hãy bấm nút bên dưới để hiển thị câu hỏi và bắt đầu 20 giây!`
      );
      container.appendChild(promptPanel);
    } else {
      // Audio Visualizer
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
        playAudioBtn.style.maxWidth = '360px';
        playAudioBtn.style.margin = '4px auto 8px';
        playAudioBtn.textContent = '🔊 PHÁT ĐOẠN ÂM THANH NHẠC CỤ';
        playAudioBtn.addEventListener('click', () => {
          if (q.audio_type === 'dan_tinh') sfx.playDanTinhSample();
          else if (q.audio_type === 'khen_mong') sfx.playKhenMongSample();
          else sfx.playGong();
        });

        container.appendChild(visualizer);
        container.appendChild(playAudioBtn);
      }

      // Buzzers Row
      const buzzerRow = document.createElement('div');
      buzzerRow.className = 'gs-buzzer-row';
      buzzerRow.style.marginBottom = '10px';

      gameshow.teams.forEach((team, idx) => {
        const btn = document.createElement('button');
        const isFirst = this.r3BuzzedTeamId === team.id;
        btn.className = `gs-buzzer-btn ${isFirst ? 'buzzed' : ''}`;
        btn.textContent = isFirst ? `🔔 ${team.name} ĐÃ BẤM CHUÔNG!` : `Bấm chuông: ${team.name}`;
        btn.addEventListener('click', () => {
          if (this.isQuestionAnswered) return;
          if (!this.r3BuzzedTeamId) {
            this.r3BuzzedTeamId = team.id;
            this.selectedTeamIndex = idx;
            sfx.playBuzzer();
            this.render();
          } else if (!this.r3SecondBuzzedTeamId && this.r3BuzzedTeamId !== team.id) {
            this.r3SecondBuzzedTeamId = team.id;
            sfx.playBuzzer();
          }
        });
        buzzerRow.appendChild(btn);
      });

      container.appendChild(buzzerRow);

      // If fill-in type question
      if (q.type === 'fill_in') {
        const fillInPanel = this.renderFillInQuestionCard(q);
        container.appendChild(fillInPanel);
      } else {
        const qPanel = this.renderQuestionCard(q, 'NHẬN DIỆN ÂM THANH NHẠC CỤ (+20 / -10 ĐIỂM)', (isCorrect) => {
          const currentTeam = gameshow.teams[this.selectedTeamIndex];
          const delta = isCorrect ? 20 : -10;
          gameshow.modifyScore(currentTeam.id, delta, isCorrect ? 'Bấm chuông đúng' : 'Bấm chuông sai');
        });
        container.appendChild(qPanel);
      }
    }

    const nav = this.createRoundNav(r3Data.questions.length, 'M03', 'Vòng 3: Tiếng Vang Đại Ngàn');
    container.appendChild(nav);

    return container;
  }

  // ==========================================================================
  // ROUND 4: LỬA THIÊNG ĐẠI NGÀN (Torches & Prey Pot)
  // ==========================================================================
  private renderRound4(): HTMLElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];
    const currentTorch = this.r4Torches[currentTeam.id] || null;
    const q = r4Data.questions[this.currentQuestionIndex % r4Data.questions.length];

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
      pot.innerHTML = `⚠️ <strong>QUỸ SĂN MỒI: +${gameshow.preyPot} ĐIỂM!</strong> (Chuông đang mở cho các nhóm còn lại cướp trọn số điểm này!)`;
      container.appendChild(pot);
    }

    if (!this.isQuestionRevealed) {
      const promptPanel = this.createRevealQuestionPrompt(
        `CÂU ${this.currentQuestionIndex + 1}/${r4Data.questions.length} · ĐỘ KHÓ: ${q.difficulty.toUpperCase()}`,
        `1. Dựa vào độ khó <strong>"${q.difficulty}"</strong>, đội đang thi có thể chọn bật <strong>Đuốc Bạc (x2: +40/-40đ)</strong>, <strong>Đuốc Vàng (x3: +60/-60đ)</strong> hoặc không dùng đuốc (+20/-10đ).<br>2. Nếu dùng Đuốc mà trả lời sai, số điểm bị trừ sẽ rơi vào <strong>Quỹ Săn Mồi</strong>!<br>3. Bấm nút bên dưới khi đã sẵn sàng mở câu hỏi!`
      );
      container.appendChild(promptPanel);
    } else {
      const qPanel = this.renderQuestionCard(q, `CHUNG KẾT · ĐỘ KHÓ: ${q.difficulty}`, (isCorrect) => {
        const torch = this.r4Torches[currentTeam.id];
        let delta = isCorrect ? 20 : -10;
        if (torch === 'silver') delta = isCorrect ? 40 : -40;
        else if (torch === 'gold') delta = isCorrect ? 60 : -60;

        if (!isCorrect && (torch === 'silver' || torch === 'gold')) {
          gameshow.preyPot = Math.abs(delta);
          sfx.playPreyWarning();
        }

        gameshow.modifyScore(currentTeam.id, delta, isCorrect ? 'Đúng câu hỏi chung kết' : 'Sai câu hỏi chung kết');
      });
      container.appendChild(qPanel);
    }

    const nav = this.createRoundNav(r4Data.questions.length, 'M04', 'Vòng 4: Lửa Thiêng Đại Ngàn');
    container.appendChild(nav);

    return container;
  }

  private createRevealQuestionPrompt(title: string, instructionsHtml: string): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel gs-r1-prompt-panel';
    panel.style.justifyContent = 'center';
    panel.style.alignItems = 'center';
    panel.style.textAlign = 'center';

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = title;
    panel.appendChild(theme);

    const desc = document.createElement('div');
    desc.style.fontSize = '16px';
    desc.style.color = 'var(--gs-text-sub)';
    desc.style.lineHeight = '1.7';
    desc.style.maxWidth = '680px';
    desc.style.margin = '12px 0 24px';
    desc.innerHTML = instructionsHtml;
    panel.appendChild(desc);

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'gs-guess-painting-btn';
    openBtn.style.maxWidth = '420px';
    openBtn.style.fontSize = '19px';
    openBtn.style.padding = '16px 28px';
    openBtn.textContent = '📖 BẤM ĐỂ HIỂN THỊ CÂU HỎI (20 GIÂY)';
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
        <p>Để bước vào ĐẠI KẾT CỤC, bạn cần hoàn thành cả 4 Vòng thi (còn thiếu <strong style="color:#e74c3c">${4 - keys}</strong> chìa khóa).</p>
        <button class="gs-btn-back-hub" style="margin-top:24px; font-size:18px; padding:14px 32px;">🚶 QUAY LẠI BẢN ĐỒ ĐỂ KHÁM PHÁ TIẾP</button>
      `;
      lockedBox.querySelector('button')!.addEventListener('click', () => this.close());
      return lockedBox;
    }

    // Nếu đã hoàn thành Đại Kết Cục -> Chuyển đến khu vực Chúc Mừng Hoàn Thành Cuộc Chơi
    if (this.isGrandFinaleCelebration) {
      return this.renderGrandVictoryCelebrationArea();
    }

    const layout = document.createElement('div');
    layout.className = 'gs-finale-container';

    // Left: Radiant Golden Bronze Drum Centerpiece
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

    const drumBadge = document.createElement('div');
    drumBadge.className = 'gs-finale-drum-badge';
    drumBadge.innerHTML = '✨ TRỐNG ĐỒNG ĐÔNG SƠN HOÀNG KIM ✨';
    leftCol.appendChild(drumBadge);

    const quote = document.createElement('div');
    quote.className = 'gs-finale-quote';
    quote.innerHTML = `
      <p>“Sông có thể cạn, núi có thể mòn, song chân lý ấy không bao giờ thay đổi: <strong>Nước Việt Nam là một, Dân tộc Việt Nam là một!</strong>”</p>
      <span>— Chủ tịch Hồ Chí Minh —</span>
    `;
    leftCol.appendChild(quote);

    layout.appendChild(leftCol);

    // Right: Giống như các minigame bên trên, ban đầu ẩn câu hỏi cho tới khi bấm nút mở (có đồng hồ 20s)
    if (!this.isQuestionRevealed) {
      const promptCol = this.createRevealQuestionPrompt(
        '🌟 THỬ THÁCH ĐẠI KẾT CỤC · GIẢI MÃ TRỐNG ĐỒNG ĐÔNG SƠN',
        `1. Cả 4 Chìa Khóa Văn Hóa đã hội tụ mở khóa <strong>Trống Đồng Đông Sơn Hoàng Kim</strong>!<br>2. Chọn Đội hoặc Cá nhân đại diện trả lời câu hỏi ý nghĩa cuối cùng (+100 điểm danh dự).<br>3. Khi đã sẵn sàng, bấm nút bên dưới để mở câu hỏi (20 giây) và tiến tới <strong>Khu Vực Chúc Mừng Hoàn Thành Cuộc Chơi</strong>!`
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
          }
        },
        () => {
          if (gameshow.isStationCompleted('board')) {
            this.isGrandFinaleCelebration = true;
          } else {
            // Cho phép thử lại nếu chọn chưa đúng ở câu Đại Kết Cục
            this.isQuestionAnswered = false;
            this.startQuestionTimer();
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

    const medals = ['🥇 QUÁN QUÂN', '🥈 Á QUÂN', '🥉 HẠNG BA', '🏅 KHUYẾN KHÍCH'];

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
          🌟 ĐỘI CHIẾN THẮNG CHUNG CUỘC: <strong style="color:${champion.color}">${champion.name.toUpperCase()} (${champion.score} ĐIỂM)</strong> 🌟
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
      this.isQuestionAnswered = false;
      this.render();
    });

    const hubBtn = wrap.querySelector<HTMLButtonElement>('[data-action="hub"]');
    hubBtn?.addEventListener('click', () => {
      this.close();
    });

    return wrap;
  }

  // ==========================================================================
  // MULTIPLE-CHOICE 4 OPTIONS QUESTION CARD (Có đồng hồ 20s & chống spam click)
  // ==========================================================================
  private renderQuestionCard(
    q: { question: string; options?: string[]; correct_index?: number; explanation?: string; special_reward_title?: string; special_reward_message?: string },
    subtitle: string,
    onAnswer: (isCorrect: boolean) => void,
    onCompleteAfterToast?: () => void
  ): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    // 20s Countdown Header
    panel.appendChild(this.createTimerHeaderWidget());

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
    if (this.activeStationId === 'board') {
      optGrid.style.gridTemplateColumns = '1fr';
    }

    const allOptionButtons: HTMLButtonElement[] = [];

    if (q.options && q.options.length) {
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'gs-option-btn';
        btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
        btn.disabled = this.isQuestionAnswered;
        allOptionButtons.push(btn);

        btn.addEventListener('click', () => {
          // Chặn tuyệt đối việc spam click nhiều lần
          if (this.isQuestionAnswered) return;
          this.isQuestionAnswered = true;
          this.stopQuestionTimer();

          allOptionButtons.forEach((b) => {
            b.disabled = true;
          });

          const isCorrect = idx === q.correct_index;
          if (isCorrect) {
            btn.classList.add('correct');
            sfx.playSuccess();
          } else {
            btn.classList.add('incorrect');
            if (typeof q.correct_index === 'number' && allOptionButtons[q.correct_index]) {
              allOptionButtons[q.correct_index].classList.add('correct');
            }
            sfx.playFailure();
          }

          // Trigger scoring
          onAnswer(isCorrect);

          // Consume blocked turn
          gameshow.consumeBlockedTurns();

          // Show floating score or card award on screen (single unified timer, no competing setTimeout!)
          const currentTeam = gameshow.teams[this.selectedTeamIndex];
          const lastDelta = gameshow.lastScoreDeltas[gameshow.lastScoreDeltas.length - 1];
          const delta = lastDelta ? lastDelta.delta : (isCorrect ? 10 : -10);

          const afterToast = () => {
            if (onCompleteAfterToast) {
              onCompleteAfterToast();
            } else {
              this.render();
            }
          };

          const qAny = q as { has_card?: string };
          if (this.activeStationId === 'board') {
            if (isCorrect) {
              this.showScoreToast(
                `🌟 ${currentTeam.name} GIẢI MÃ THÀNH CÔNG!`,
                100,
                `🏆 ${q.special_reward_title || ''}\n\n${q.special_reward_message || ''}`,
                4200,
                afterToast
              );
            } else {
              this.showScoreToast(
                'CHƯA CHÍNH XÁC',
                0,
                'Hãy suy nghĩ về cội nguồn sức mạnh ngàn đời của khối đại đoàn kết toàn dân tộc.',
                2800,
                afterToast
              );
            }
          } else if (isCorrect && qAny.has_card) {
            gameshow.awardCard(currentTeam.id, qAny.has_card as FunctionalCardType);
            this.showCardAwardToast(currentTeam.name, qAny.has_card as FunctionalCardType, afterToast);
          } else {
            this.showScoreToast(currentTeam.name, delta, q.explanation || '', 3200, afterToast);
          }
        });

        optGrid.appendChild(btn);
      });
    }

    panel.appendChild(theme);
    panel.appendChild(text);
    panel.appendChild(optGrid);

    // Advance button to move to next question
    if (this.activeStationId !== 'M01' && this.activeStationId !== 'board') {
      const advanceRow = document.createElement('div');
      advanceRow.className = 'gs-advance-next-row';
      const totalQ = this.activeStationId === 'M02'
        ? r2Data.questions.length
        : (this.activeStationId === 'M03' ? r3Data.questions.length : r4Data.questions.length);

      if (this.currentQuestionIndex < totalQ - 1) {
        const nextQBtn = document.createElement('button');
        nextQBtn.type = 'button';
        nextQBtn.className = 'gs-btn-advance-5s';
        nextQBtn.innerHTML = `👉 CHUYỂN SANG CÂU TIẾP THEO (${this.currentQuestionIndex + 2}/${totalQ}) ➡`;
        nextQBtn.addEventListener('click', () => {
          this.clearActiveToast();
          this.stopQuestionTimer();
          this.currentQuestionIndex++;
          this.isQuestionRevealed = false;
          this.isQuestionAnswered = false;
          this.r3BuzzedTeamId = null;
          this.r3SecondBuzzedTeamId = null;
          this.render();
        });
        advanceRow.appendChild(nextQBtn);
      }
      panel.appendChild(advanceRow);
    }

    return panel;
  }

  // ==========================================================================
  // FILL-IN QUESTION CARD (Có đồng hồ 20s & thanh gõ câu trả lời)
  // ==========================================================================
  private renderFillInQuestionCard(q: { question: string; correct_answer?: string; explanation?: string; has_card?: string | null }): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

    // 20s Countdown Header
    panel.appendChild(this.createTimerHeaderWidget());

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = 'ĐIỀN KHUYẾT CA DAO TỤC NGỮ (+20 / -10 ĐIỂM)';

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = q.question;

    // Fill-in input row
    const inputRow = document.createElement('div');
    inputRow.className = 'gs-fillin-row';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'gs-fillin-input';
    input.placeholder = `Người phụ trách gõ câu trả lời cho [${currentTeam.name}] tại đây...`;
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

      this.isQuestionAnswered = true;
      this.stopQuestionTimer();
      input.disabled = true;
      submitBtn.disabled = true;

      const typed = normalizeVietnamese(rawVal);
      const standard = normalizeVietnamese(q.correct_answer || '');
      const isCorrect = typed === standard || (standard.length > 0 && typed.includes(standard));

      if (isCorrect) {
        gameshow.modifyScore(currentTeam.id, +20, 'Điền khuyết đúng');
        sfx.playSuccess();
        input.classList.add('correct');
      } else {
        gameshow.modifyScore(currentTeam.id, -10, 'Điền khuyết sai');
        sfx.playFailure();
        input.classList.add('incorrect');
      }

      gameshow.consumeBlockedTurns();

      const afterToast = () => {
        this.render();
      };

      if (isCorrect && q.has_card) {
        gameshow.awardCard(currentTeam.id, q.has_card as FunctionalCardType);
        this.showCardAwardToast(currentTeam.name, q.has_card as FunctionalCardType, afterToast);
      } else {
        this.showScoreToast(
          currentTeam.name,
          isCorrect ? +20 : -10,
          `Đáp án chính xác: "${q.correct_answer}". ${q.explanation || ''}`,
          3200,
          afterToast
        );
      }
    };

    submitBtn.addEventListener('click', checkAnswer);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkAnswer();
      }
    });

    inputRow.appendChild(input);
    inputRow.appendChild(submitBtn);

    panel.appendChild(theme);
    panel.appendChild(text);
    panel.appendChild(inputRow);

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
        this.isQuestionAnswered = false;
        this.r3BuzzedTeamId = null;
        this.r3SecondBuzzedTeamId = null;
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
        this.isQuestionAnswered = false;
        this.r3BuzzedTeamId = null;
        this.r3SecondBuzzedTeamId = null;
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
      cardDesc = 'Khóa quyền trả lời/bấm chuông của 1 đội đối thủ ở câu hỏi kế tiếp.';
      cardColor = '#e74c3c';
    } else if (cardType === 'shield') {
      cardIcon = '🛡️';
      cardTitle = 'THẺ KHIÊN BẢO VỆ';
      cardDesc = 'Vô hiệu hóa 1 đòn tấn công từ đội khác (Chống bị cướp điểm hoặc chống bị cấm lượt).';
      cardColor = '#2ecc71';
    }

    toast.innerHTML = `
      <div class="gs-card-award-card" style="border-color:${cardColor}">
        <div class="gs-card-award-crown">👑 PHẦN THƯỞNG PHIẾU CHỨC NĂNG 👑</div>
        <div class="gs-card-award-icon">${cardIcon}</div>
        <div class="gs-card-award-type" style="color:${cardColor}">${cardTitle}</div>
        <div class="gs-card-award-winner">Trao cho: <strong>${teamName}</strong></div>
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

    const msg = isNew
      ? `🎉 XIN CHÚC MỪNG CÁC ĐỘI!\nĐã hoàn thành xuất sắc [${stationName}] và mở khóa thành công CHÌA KHÓA thứ ${totalKeys}/4!\n\nCòn thiếu ${4 - totalKeys} chìa khóa nữa để mở khóa Hình ảnh Trống Đồng Đông Sơn.`
      : `Vòng thi [${stationName}] đã hoàn thành trước đó! (Hiện có ${totalKeys}/4 Chìa Khóa)`;

    this.showScoreToast('CHÌA KHÓA THU THẬP', 0, msg, 4000, () => {
      this.render();
    });
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
    const drumImg = document.createElement('img');
    drumImg.src = 'assets/sprites/trong_dong_dong_son.svg';
    drumImg.alt = 'Trống Đồng Đông Sơn Hoàng Kim';
    drumImg.className = 'gs-drum-unlock-img';
    drumVisualWrap.appendChild(drumImg);

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
  // FLOATING SCORE TOAST (Thống nhất 1 bộ hẹn giờ duy nhất, không xung đột render)
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
