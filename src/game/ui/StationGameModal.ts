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

export class StationGameModal {
  private static instance: StationGameModal | null = null;
  private modalContainer: HTMLElement;
  private activeStationId: 'M01' | 'M02' | 'M03' | 'M04' | 'board' = 'M01';
  private selectedTeamIndex = 0; // Nhóm đang được chọn để trả lời
  private currentQuestionIndex = 0;

  // Round 2 Bids
  private r2Bids: Record<string, number> = {};

  // Round 3 Buzzers
  private r3BuzzedTeamId: string | null = null;
  private r3SecondBuzzedTeamId: string | null = null;

  // Round 4 Torches
  private r4Torches: Record<string, 'silver' | 'gold' | null> = {};

  // 5s Strategy / Functional Card Phase
  private is5sPhaseActive = false;
  private timer5sSecondsLeft = 5;
  private timer5sInterval: number | null = null;
  private activeStrategyNotice: string | null = null;
  private cardTargetPicker: { type: 'steal' | 'block'; userTeamId: string } | null = null;

  private onCloseCallback?: () => void;

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

  open(stationId: 'M01' | 'M02' | 'M03' | 'M04' | 'board', onClose?: () => void) {
    this.activeStationId = stationId;
    this.currentQuestionIndex = 0;
    this.onCloseCallback = onClose;
    this.modalContainer.style.display = 'flex';
    sfx.playGong();
    if (stationId !== 'board') {
      this.start5sPhase();
    } else {
      this.stop5sPhase();
      this.render();
    }
  }

  close() {
    this.stop5sPhase();
    this.modalContainer.style.display = 'none';
    this.modalContainer.innerHTML = '';
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  start5sPhase() {
    this.stop5sPhase();
    this.is5sPhaseActive = true;
    this.timer5sSecondsLeft = 5;
    this.cardTargetPicker = null;
    this.render();

    this.timer5sInterval = window.setInterval(() => {
      this.timer5sSecondsLeft--;
      if (this.timer5sSecondsLeft > 0) {
        sfx.playTick(this.timer5sSecondsLeft === 1 ? 1200 : 880);
        const cdElem = this.modalContainer.querySelector('.gs-countdown-number');
        if (cdElem) cdElem.textContent = String(this.timer5sSecondsLeft);
      } else {
        this.stop5sPhase();
        sfx.playBuzzer();
        this.render();
      }
    }, 1000);
  }

  stop5sPhase() {
    this.is5sPhaseActive = false;
    this.cardTargetPicker = null;
    if (this.timer5sInterval !== null) {
      clearInterval(this.timer5sInterval);
      this.timer5sInterval = null;
    }
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
      stationSubtitle = 'Lật mở 9 ô hoa văn giải mã Bức tranh bí ẩn';
    } else if (this.activeStationId === 'M02') {
      stationTitle = '🎪 LÁN TRẠI 2: PHIÊN CHỢ VÙNG CAO';
      stationSubtitle = 'Đấu thầu điểm cược 10–30 điểm theo chủ đề';
    } else if (this.activeStationId === 'M03') {
      stationTitle = '🎵 LÁN TRẠI 3: TIẾNG VANG ĐẠI NGÀN';
      stationSubtitle = 'Chuông phản xạ, âm thanh nhạc cụ và điền khuyết ca dao';
    } else if (this.activeStationId === 'M04') {
      stationTitle = '🔥 LÁN TRẠI 4: LỬA THIÊNG ĐẠI NGÀN';
      stationSubtitle = 'Đuốc Bạc (x2), Đuốc Vàng (x3) và Cơ chế Săn Mồi';
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
    keyStatusBox.innerHTML = `
      <div class="gs-key-pill ${totalKeys >= 4 ? 'gold' : ''}">🗝️ Chìa Khóa: ${totalKeys}/4</div>
      ${this.activeStationId !== 'board' ? `
        <div class="gs-round-status-tag ${isThisCompleted ? 'completed' : 'pending'}">
          ${isThisCompleted ? '✅ ĐÃ NHẬN CHÌA KHÓA' : '🔒 CHƯA HOÀN THÀNH'}
        </div>
      ` : `
        <div class="gs-round-status-tag ${totalKeys >= 4 ? 'completed' : 'pending'}">
          ${totalKeys >= 4 ? '✨ ĐÃ MỞ PHONG ẤN' : '🔒 ĐANG BỊ PHONG ẤN'}
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

    // 2. Team Selector Bar (Chọn Nhóm trả lời)
    const teamSelectorBar = this.createTeamSelectorBar();
    dialog.appendChild(teamSelectorBar);

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
  // TEAM SELECTOR BAR (Click chọn Nhóm trả lời câu hỏi)
  // ==========================================================================
  private createTeamSelectorBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'gs-team-selector-bar';

    const label = document.createElement('div');
    label.className = 'gs-selector-label';
    label.innerHTML = `CHỌN NHÓM TRẢ LỜI CÂU HỎI:`;
    bar.appendChild(label);

    const row = document.createElement('div');
    row.className = 'gs-selector-row';

    gameshow.teams.forEach((team, idx) => {
      const btn = document.createElement('button');
      const isSelected = idx === this.selectedTeamIndex;
      const isBlocked = team.isBlockedNextQuestion;
      btn.className = `gs-selector-team-btn ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''}`;
      btn.style.borderColor = team.color;

      btn.innerHTML = `
        <span class="gs-st-name">${team.name} ${isBlocked ? '🔒 (CẤM LƯỢT)' : ''}</span>
        <span class="gs-st-score">${team.score}đ</span>
        <span class="gs-st-cards">⚡${team.cards.steal_points} 🔒${team.cards.block_turn} 🛡️${team.cards.shield}</span>
      `;

      btn.addEventListener('click', () => {
        if (isBlocked) {
          sfx.playFailure();
          alert(`🔒 ${team.name} đang bị CẤM LƯỢT ở câu hỏi này! Không thể chọn để trả lời.`);
          return;
        }
        this.selectedTeamIndex = idx;
        sfx.playBuzzer();
        this.render();
      });

      row.appendChild(btn);
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
    secretImg.alt = r1Data.secret_title;
    mosaicBox.appendChild(secretImg);

    const grid = document.createElement('div');
    grid.className = 'gs-mosaic-grid';

    for (let i = 0; i < 9; i++) {
      const tile = document.createElement('div');
      const isOpened = gameshow.r1OpenedTiles[i];
      const isCurrentSelected = i === this.currentQuestionIndex;
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
          this.currentQuestionIndex = i;
          sfx.playBuzzer();
          this.start5sPhase();
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
    guessBtn.addEventListener('click', () => this.handleGuessSecretPainting());
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

    // Right: Question Panel or 5s Strategy Phase
    const q = r1Data.questions[this.currentQuestionIndex];
    let rightCol: HTMLElement;

    if (this.is5sPhaseActive) {
      rightCol = this.render5sPhase(`Mảnh ghép số ${this.currentQuestionIndex + 1}`, () => {
        this.stop5sPhase();
        this.render();
      });
    } else {
      const isCurrentOpened = gameshow.r1OpenedTiles[this.currentQuestionIndex];
      if (isCurrentOpened) {
        rightCol = document.createElement('div');
        rightCol.className = 'gs-question-panel gs-r1-prompt-panel';
        rightCol.innerHTML = `
          <div class="gs-q-theme">🎯 MẢNH GHÉP SỐ ${this.currentQuestionIndex + 1} ĐÃ ĐƯỢC LẬT MỞ!</div>
          <div class="gs-q-text" style="text-align:center; padding: 25px 15px;">
            <p style="font-size: 20px; color: var(--gs-gold); font-weight:800; margin-bottom: 12px;">👉 MỜI ĐỘI TIẾP THEO CHỌN MẢNH GHÉP TRÊN LƯỚI 3x3!</p>
            <p style="font-size: 14px; color: var(--gs-text-sub); line-height: 1.6;">
              Bấm chọn một ô số chưa mở bất kỳ trên lưới bên trái.<br>
              <strong>Lưu ý:</strong> Ngay khi chọn ô, hệ thống sẽ kích hoạt <strong>5 GIÂY ĐƯA RA QUYẾT ĐỊNH CÓ DÙNG PHIẾU CHỨC NĂNG HAY KHÔNG</strong> trước khi câu hỏi xuất hiện!
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
          }
        );
      }
    }

    container.appendChild(rightCol);
    return container;
  }

  // ==========================================================================
  // ROUND 2: PHIÊN CHỢ VÙNG CAO
  // ==========================================================================
  private renderRound2(): HTMLElement {
    if (this.is5sPhaseActive) {
      return this.render5sPhase(`Vòng 2 - Câu ${this.currentQuestionIndex + 1}`, () => {
        this.stop5sPhase();
        this.render();
      });
    }

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const q = r2Data.questions[this.currentQuestionIndex % r2Data.questions.length];
    const currentTeam = gameshow.teams[this.selectedTeamIndex];
    const currentBid = this.r2Bids[currentTeam.id] || 10;

    // Question
    const qPanel = this.renderQuestionCard(
      q,
      `CHỦ ĐỀ: ${q.theme} · MỨC CƯỢC CỦA ${currentTeam.name}: ${currentBid} ĐIỂM`,
      (isCorrect) => {
        const delta = isCorrect ? currentBid : -currentBid;
        gameshow.modifyScore(currentTeam.id, delta, isCorrect ? 'Thắng điểm cược' : 'Thua điểm cược');
      }
    );

    container.appendChild(qPanel);

    const nav = this.createRoundNav(r2Data.questions.length, 'M02', 'Vòng 2: Phiên Chợ Vùng Cao');
    container.appendChild(nav);

    return container;
  }

  // ==========================================================================
  // ROUND 3: TIẾNG VANG ĐẠI NGÀN (Audio & Fill-in text input)
  // ==========================================================================
  private renderRound3(): HTMLElement {
    if (this.is5sPhaseActive) {
      return this.render5sPhase(`Vòng 3 - Câu ${this.currentQuestionIndex + 1}`, () => {
        this.stop5sPhase();
        this.render();
      });
    }

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const q = r3Data.questions[this.currentQuestionIndex % r3Data.questions.length];

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
      playAudioBtn.style.margin = '8px auto';
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

    gameshow.teams.forEach((team, idx) => {
      const btn = document.createElement('button');
      const isFirst = this.r3BuzzedTeamId === team.id;
      btn.className = `gs-buzzer-btn ${isFirst ? 'buzzed' : ''}`;
      btn.textContent = isFirst ? `🔔 ${team.name} ĐÃ BẤM CHUÔNG!` : `Bấm chuông: ${team.name}`;
      btn.addEventListener('click', () => {
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

    const nav = this.createRoundNav(r3Data.questions.length, 'M03', 'Vòng 3: Tiếng Vang Đại Ngàn');
    container.appendChild(nav);

    return container;
  }

  // ==========================================================================
  // ROUND 4: LỬA THIÊNG ĐẠI NGÀN (Torches & Prey Pot)
  // ==========================================================================
  private renderRound4(): HTMLElement {
    if (this.is5sPhaseActive) {
      return this.render5sPhase(`Vòng 4 - Câu ${this.currentQuestionIndex + 1}`, () => {
        this.stop5sPhase();
        this.render();
      });
    }

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';

    const currentTeam = gameshow.teams[this.selectedTeamIndex];
    const currentTorch = this.r4Torches[currentTeam.id] || null;

    // Torch active indicator in Question View
    if (currentTorch) {
      const torchBadge = document.createElement('div');
      torchBadge.className = 'gs-torch-active-indicator';
      torchBadge.innerHTML = `🔥 <strong>${currentTeam.name}</strong> đang cược: <span style="color:var(--gs-gold); font-weight:800;">${currentTorch === 'silver' ? 'THẺ ĐUỐC BẠC (x2: +40 / -40 ĐIỂM)' : 'THẺ ĐUỐC VÀNG (x3: +60 / -60 ĐIỂM)'}</span>`;
      container.appendChild(torchBadge);
    }

    // Prey Pot Alert
    if (gameshow.preyPot > 0) {
      const pot = document.createElement('div');
      pot.className = 'gs-prey-pot';
      pot.innerHTML = `⚠️ <strong>QUỸ SĂN MỒI: +${gameshow.preyPot} ĐIỂM!</strong> (Chuông đang mở cho các nhóm còn lại cướp trọn số điểm này!)`;
      container.appendChild(pot);
    }

    const q = r4Data.questions[this.currentQuestionIndex % r4Data.questions.length];
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

    const nav = this.createRoundNav(r4Data.questions.length, 'M04', 'Vòng 4: Lửa Thiêng Đại Ngàn');
    container.appendChild(nav);

    return container;
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

    // Right: Individual challenge question
    const rightCol = document.createElement('div');
    rightCol.className = 'gs-question-panel';

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = '🌟 PHẦN THƯỞNG ĐẶC BIỆT DÀNH CHO CÁ NHÂN GIẢI MÃ Ý NGHĨA';

    const text = document.createElement('div');
    text.className = 'gs-q-text';
    text.textContent = finaleData.challenge_question.question;

    const optGrid = document.createElement('div');
    optGrid.className = 'gs-options-grid';
    optGrid.style.gridTemplateColumns = '1fr';

    finaleData.challenge_question.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'gs-option-btn';
      btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
      btn.addEventListener('click', () => {
        if (idx === finaleData.challenge_question.correct_index) {
          btn.classList.add('correct');
          sfx.playSuccess();
          sfx.playGong();
          gameshow.markStationCompleted('board');
          this.showScoreToast(
            '🌟 CÁ NHÂN XUẤT SẮC ĐẠT GIẢI',
            100,
            `🏆 ${finaleData.challenge_question.special_reward_title}\n\n${finaleData.challenge_question.special_reward_message}`,
            6000
          );
        } else {
          btn.classList.add('incorrect');
          sfx.playFailure();
          alert('Chưa chính xác! Hãy suy nghĩ về cội nguồn sức mạnh ngàn đời của khối đại đoàn kết toàn dân tộc.');
        }
      });
      optGrid.appendChild(btn);
    });

    rightCol.appendChild(theme);
    rightCol.appendChild(text);
    rightCol.appendChild(optGrid);

    layout.appendChild(rightCol);
    return layout;
  }

  // ==========================================================================
  // MULTIPLE-CHOICE 4 OPTIONS QUESTION CARD (Tự động cộng/trừ điểm theo Nhóm)
  // ==========================================================================
  private renderQuestionCard(
    q: { question: string; options?: string[]; correct_index?: number; explanation?: string },
    subtitle: string,
    onAnswer: (isCorrect: boolean) => void
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

    if (q.options && q.options.length) {
      q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'gs-option-btn';
        btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;

        btn.addEventListener('click', () => {
          const isCorrect = idx === q.correct_index;
          if (isCorrect) {
            btn.classList.add('correct');
            sfx.playSuccess();
          } else {
            btn.classList.add('incorrect');
            sfx.playFailure();
          }

          // Trigger scoring
          onAnswer(isCorrect);

          // Show floating score or card award on screen
          const currentTeam = gameshow.teams[this.selectedTeamIndex];
          const lastDelta = gameshow.lastScoreDeltas[gameshow.lastScoreDeltas.length - 1];
          const delta = lastDelta ? lastDelta.delta : (isCorrect ? 10 : -10);

          const qAny = q as { has_card?: string };
          if (isCorrect && qAny.has_card) {
            gameshow.awardCard(currentTeam.id, qAny.has_card as FunctionalCardType);
            this.showCardAwardToast(currentTeam.name, qAny.has_card as FunctionalCardType);
          } else {
            this.showScoreToast(currentTeam.name, delta, q.explanation || '');
          }

          // Consume blocked turn
          gameshow.consumeBlockedTurns();

          setTimeout(() => {
            this.render();
          }, 3500);
        });

        optGrid.appendChild(btn);
      });
    }

    panel.appendChild(theme);
    panel.appendChild(text);
    panel.appendChild(optGrid);

    // Advance button to start 5s phase for next question
    if (this.activeStationId !== 'M01') {
      const advanceRow = document.createElement('div');
      advanceRow.className = 'gs-advance-next-row';
      const totalQ = this.activeStationId === 'M02'
        ? r2Data.questions.length
        : (this.activeStationId === 'M03' ? r3Data.questions.length : r4Data.questions.length);

      if (this.currentQuestionIndex < totalQ - 1) {
        const nextQBtn = document.createElement('button');
        nextQBtn.className = 'gs-btn-advance-5s';
        nextQBtn.innerHTML = `👉 CHUYỂN SANG CÂU TIẾP THEO (${this.currentQuestionIndex + 2}/${totalQ}) · BẮT ĐẦU 5 GIÂY QUYẾT ĐỊNH ➡`;
        nextQBtn.addEventListener('click', () => {
          this.currentQuestionIndex++;
          this.start5sPhase();
        });
        advanceRow.appendChild(nextQBtn);
      }
      panel.appendChild(advanceRow);
    }

    return panel;
  }

  // ==========================================================================
  // FILL-IN QUESTION CARD (Có thanh gõ câu trả lời theo yêu cầu của bạn)
  // ==========================================================================
  private renderFillInQuestionCard(q: { question: string; correct_answer?: string; explanation?: string; has_card?: string | null }): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

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

    const submitBtn = document.createElement('button');
    submitBtn.className = 'gs-fillin-submit-btn';
    submitBtn.textContent = '✔ KIỂM TRA ĐÁP ÁN';

    const checkAnswer = () => {
      const typed = input.value.trim().toLowerCase();
      const standard = (q.correct_answer || '').trim().toLowerCase();
      const isCorrect = typed === standard || typed.includes(standard);

      if (isCorrect) {
        gameshow.modifyScore(currentTeam.id, +20, 'Điền khuyết đúng');
        sfx.playSuccess();
        input.classList.add('correct');
      } else {
        gameshow.modifyScore(currentTeam.id, -10, 'Điền khuyết sai');
        sfx.playFailure();
        input.classList.add('incorrect');
      }

      if (isCorrect && q.has_card) {
        gameshow.awardCard(currentTeam.id, q.has_card as FunctionalCardType);
        this.showCardAwardToast(currentTeam.name, q.has_card as FunctionalCardType);
      } else {
        this.showScoreToast(
          currentTeam.name,
          isCorrect ? +20 : -10,
          `Đáp án chính xác: "${q.correct_answer}". ${q.explanation || ''}`
        );
      }

      setTimeout(() => {
        this.currentQuestionIndex++;
        this.start5sPhase();
      }, 3500);
    };

    submitBtn.addEventListener('click', checkAnswer);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
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
        this.currentQuestionIndex--;
        this.start5sPhase();
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
        this.currentQuestionIndex++;
        this.start5sPhase();
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
  // 5-SECOND STRATEGY / FUNCTIONAL CARD PHASE
  // ==========================================================================
  private render5sPhase(
    roundTitle: string,
    onSkip: () => void
  ): HTMLElement {
    const box = document.createElement('div');
    box.className = 'gs-5s-prep-container';

    // 1. Header with unmistakable prominent title
    const header = document.createElement('div');
    header.className = 'gs-5s-header';
    header.innerHTML = `
      <div class="gs-5s-badge">⏱️ THỜI GIAN ĐƯA RA QUYẾT ĐỊNH TRƯỚC CÂU HỎI · ${roundTitle.toUpperCase()}</div>
      <h2 class="gs-5s-main-title">TRƯỚC MỖI CÂU HỎI: 5 GIÂY ĐƯA RA QUYẾT ĐỊNH CÓ DÙNG PHIẾU CHỨC NĂNG HAY KHÔNG?</h2>
      <p class="gs-5s-sub-desc">
        🔒 Nội dung câu hỏi và các phương án đang được tạm ẩn.<br>
        Các đội có đúng <strong>5 giây</strong> để đưa ra quyết định: Kích hoạt Phiếu Chức Năng (Cướp Điểm, Cấm Lượt${this.activeStationId === 'M04' ? ', Đuốc Bạc/Vàng' : ''}) hoặc Bỏ qua không sử dụng.
      </p>
    `;
    box.appendChild(header);

    // Active Strategy Notice
    if (this.activeStrategyNotice) {
      const notice = document.createElement('div');
      notice.className = 'gs-5s-notice-box';
      notice.textContent = this.activeStrategyNotice;
      box.appendChild(notice);
    }

    // 2. Countdown Circle
    const timerRow = document.createElement('div');
    timerRow.className = 'gs-5s-timer-row';
    timerRow.innerHTML = `
      <div class="gs-countdown-circle">
        <span class="gs-countdown-number">${this.timer5sSecondsLeft}</span>
        <span class="gs-countdown-label">GIÂY</span>
      </div>
    `;
    box.appendChild(timerRow);

    // Round 2 Bidding Chips (nếu là Vòng 2)
    if (this.activeStationId === 'M02') {
      const q = r2Data.questions[this.currentQuestionIndex % r2Data.questions.length];
      const curTeam = gameshow.teams[this.selectedTeamIndex];
      const currentBid = this.r2Bids[curTeam.id] || 10;

      const bidBox = document.createElement('div');
      bidBox.className = 'gs-r2-bid-box';
      bidBox.style.margin = '4px 0 10px';
      bidBox.innerHTML = `<div>ĐẤU THẦU ĐIỂM CƯỢC: <strong style="color:var(--gs-gold)">${q.theme}</strong> (Dành cho: <span style="color:#2ecc71">${curTeam.name}</span>)</div>`;

      const bidRow = document.createElement('div');
      bidRow.className = 'gs-bid-row';

      [10, 15, 20, 25, 30].forEach((amount) => {
        const chip = document.createElement('div');
        chip.className = `gs-bid-chip ${currentBid === amount ? 'active' : ''}`;
        chip.textContent = `${amount} điểm`;
        chip.addEventListener('click', () => {
          this.r2Bids[curTeam.id] = amount;
          sfx.playBuzzer();
          this.render();
        });
        bidRow.appendChild(chip);
      });

      bidBox.appendChild(bidRow);
      box.appendChild(bidBox);
    }

    // 3. Grid of Teams
    const teamsGrid = document.createElement('div');
    teamsGrid.className = 'gs-5s-teams-grid';

    gameshow.teams.forEach((team) => {
      const card = document.createElement('div');
      card.className = 'gs-5s-team-card';
      card.style.borderColor = team.color;

      const teamHeader = document.createElement('div');
      teamHeader.className = 'gs-5s-team-header';
      teamHeader.innerHTML = `
        <strong style="color:${team.color}">${team.name}</strong>
        <span class="gs-5s-team-score">${team.score}đ</span>
      `;
      card.appendChild(teamHeader);

      const actionList = document.createElement('div');
      actionList.className = 'gs-5s-team-actions';

      let hasUsableCard = false;

      // Thẻ Cướp Điểm
      if (team.cards.steal_points > 0) {
        hasUsableCard = true;
        const stealBtn = document.createElement('button');
        stealBtn.className = 'gs-card-act-btn steal';
        stealBtn.innerHTML = `⚡ Dùng Cướp Điểm (${team.cards.steal_points})`;
        stealBtn.addEventListener('click', () => {
          this.cardTargetPicker = { type: 'steal', userTeamId: team.id };
          this.render();
        });
        actionList.appendChild(stealBtn);
      }

      // Thẻ Cấm Lượt
      if (team.cards.block_turn > 0) {
        hasUsableCard = true;
        const blockBtn = document.createElement('button');
        blockBtn.className = 'gs-card-act-btn block';
        blockBtn.innerHTML = `🔒 Dùng Cấm Lượt (${team.cards.block_turn})`;
        blockBtn.addEventListener('click', () => {
          this.cardTargetPicker = { type: 'block', userTeamId: team.id };
          this.render();
        });
        actionList.appendChild(blockBtn);
      }

      // Thẻ Khiên
      if (team.cards.shield > 0) {
        const shieldPill = document.createElement('div');
        shieldPill.className = 'gs-card-shield-pill';
        shieldPill.innerHTML = `🛡️ Khiên Bảo Vệ (${team.cards.shield}) sẵn sàng`;
        actionList.appendChild(shieldPill);
      }

      // Vòng 4: Thẻ Đuốc Bạc / Đuốc Vàng
      if (this.activeStationId === 'M04') {
        const torchRow = document.createElement('div');
        torchRow.className = 'gs-5s-torch-row';

        const currentTorch = this.r4Torches[team.id];

        const silverBtn = document.createElement('button');
        silverBtn.className = `gs-torch-mini ${currentTorch === 'silver' ? 'active' : ''}`;
        silverBtn.textContent = '🥈 Đuốc Bạc (x2)';
        silverBtn.addEventListener('click', () => {
          this.r4Torches[team.id] = currentTorch === 'silver' ? null : 'silver';
          sfx.playCardActivate();
          this.render();
        });

        const goldBtn = document.createElement('button');
        goldBtn.className = `gs-torch-mini ${currentTorch === 'gold' ? 'active' : ''}`;
        goldBtn.textContent = '🥇 Đuốc Vàng (x3)';
        goldBtn.addEventListener('click', () => {
          this.r4Torches[team.id] = currentTorch === 'gold' ? null : 'gold';
          sfx.playCardActivate();
          this.render();
        });

        torchRow.appendChild(silverBtn);
        torchRow.appendChild(goldBtn);
        actionList.appendChild(torchRow);
      }

      // In-line Target Picker for Steal or Block (Non-blocking in-game buttons!)
      if (this.cardTargetPicker && this.cardTargetPicker.userTeamId === team.id) {
        const pickerBox = document.createElement('div');
        pickerBox.className = 'gs-5s-target-picker';

        const pickerTitle = document.createElement('div');
        pickerTitle.className = 'gs-5s-target-title';
        pickerTitle.textContent = this.cardTargetPicker.type === 'steal'
          ? '🎯 CHỌN ĐỘI ĐỂ RÚT 20 ĐIỂM:'
          : '🎯 CHỌN ĐỘI ĐỂ CẤM LƯỢT Ở CÂU NÀY:';
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
              if (res.shielded) {
                sfx.playCardActivate();
                this.activeStrategyNotice = `🛡️ ${res.message}`;
              } else if (res.success) {
                sfx.playSuccess();
                this.activeStrategyNotice = `⚡ ${res.message}`;
              } else {
                this.activeStrategyNotice = res.message;
              }
            } else if (this.cardTargetPicker?.type === 'block') {
              const res = gameshow.useBlockTurnCard(team.id, tgt.id);
              if (res.shielded) {
                sfx.playCardActivate();
                this.activeStrategyNotice = `🛡️ ${res.message}`;
              } else if (res.success) {
                sfx.playCardActivate();
                this.activeStrategyNotice = `🔒 ${res.message}`;
              } else {
                this.activeStrategyNotice = res.message;
              }
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
        actionList.appendChild(pickerBox);
      }

      if (!hasUsableCard && team.cards.shield <= 0 && this.activeStationId !== 'M04') {
        const noCard = document.createElement('div');
        noCard.className = 'gs-5s-no-card';
        noCard.textContent = 'Chưa sở hữu phiếu chức năng';
        actionList.appendChild(noCard);
      }

      card.appendChild(actionList);
      teamsGrid.appendChild(card);
    });

    box.appendChild(teamsGrid);

    // 4. Skip Button
    const footer = document.createElement('div');
    footer.className = 'gs-5s-footer';
    const skipBtn = document.createElement('button');
    skipBtn.className = 'gs-5s-skip-btn';
    skipBtn.textContent = '⏩ BỎ QUA 5 GIÂY · BẮT ĐẦU CÂU HỎI NGAY';
    skipBtn.addEventListener('click', onSkip);
    footer.appendChild(skipBtn);

    box.appendChild(footer);
    return box;
  }

  // ==========================================================================
  // CARD AWARD CELEBRATION TOAST
  // ==========================================================================
  private showCardAwardToast(teamName: string, cardType: FunctionalCardType) {
    const existing = this.modalContainer.querySelector('.gs-score-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'gs-score-toast gs-card-award-toast';

    let cardTitle = '';
    let cardIcon = '';
    let cardDesc = '';
    let cardColor = '';

    if (cardType === 'steal_points') {
      cardIcon = '⚡';
      cardTitle = 'THẺ CƯỚP ĐIỂM';
      cardDesc = 'Rút trực tiếp 20 điểm từ 1 đội bất kỳ chuyển về quỹ điểm của đội mình (Dùng ngay sau khi kết thúc một câu hỏi bất kỳ).';
      cardColor = '#f39c12';
    } else if (cardType === 'block_turn') {
      cardIcon = '🔒';
      cardTitle = 'THẺ CẤM LƯỢT';
      cardDesc = 'Khóa hoàn toàn quyền trả lời/bấm chuông của 1 đội đối thủ ở câu hỏi kế tiếp (Dùng trong 5 giây trước khi vào câu hỏi).';
      cardColor = '#e74c3c';
    } else if (cardType === 'shield') {
      cardIcon = '🛡️';
      cardTitle = 'THẺ KHIÊN BẢO VỆ';
      cardDesc = 'Vô hiệu hóa 1 đòn tấn công từ đội khác (Chống bị cướp điểm hoặc chống bị cấm lượt, phản đòn ngay tại thời điểm bị tác động).';
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
      toast.remove();
      this.render();
    };

    toast.addEventListener('click', dismiss);
    this.modalContainer.appendChild(toast);

    setTimeout(() => {
      dismiss();
    }, 4500);
  }

  private finishCurrentStation(stationId: string, stationName: string) {
    const isNew = gameshow.markStationCompleted(stationId);
    sfx.playGong();
    sfx.playSuccess();
    const totalKeys = gameshow.getCollectedKeysCount();
    const msg = isNew
      ? `🎉 XIN CHÚC MỪNG CÁC ĐỘI!\nĐã hoàn thành xuất sắc [${stationName}] và mở khóa thành công CHÌA KHÓA thứ ${totalKeys}/4!\n\n${totalKeys >= 4 ? '✨ ĐÃ THU THẬP ĐỦ 4 CHÌA KHÓA! Phong ấn Trống Đồng Đông Sơn tại trung tâm bản đồ đã được phá giải!' : `Còn thiếu ${4 - totalKeys} chìa khóa nữa để mở Trống Đồng Đông Sơn.`}`
      : `Vòng thi [${stationName}] đã hoàn thành trước đó! (Hiện có ${totalKeys}/4 Chìa Khóa)`;

    this.showScoreToast('CHÌA KHÓA THU THẬP', 0, msg, 4500);
    setTimeout(() => {
      this.render();
    }, 2000);
  }

  // ==========================================================================
  // FLOATING SCORE TOAST (Kéo dài 4s cùng hiệu ứng bắt mắt theo yêu cầu)
  // ==========================================================================
  private showScoreToast(teamName: string, delta: number, explanation: string, durationMs = 4000) {
    const existing = this.modalContainer.querySelector('.gs-score-toast');
    if (existing) existing.remove();

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
      toast.remove();
    };

    toast.addEventListener('click', dismiss);
    this.modalContainer.appendChild(toast);

    setTimeout(() => {
      dismiss();
    }, durationMs);
  }

  // ==========================================================================
  // GUESS SECRET PAINTING (Vòng 1)
  // ==========================================================================
  private handleGuessSecretPainting() {
    const curTeam = gameshow.teams[this.selectedTeamIndex];
    const points = gameshow.getRound1PictureGuessPoints();
    const confirmed = window.confirm(
      `${curTeam.name} muốn đoán bức tranh tổng thể (+${points} điểm nếu đúng, BỊ LOẠI khỏi Vòng 1 nếu sai)?`
    );
    if (!confirmed) return;

    const isCorrect = window.confirm(`MC xác nhận: ${curTeam.name} trả lời ĐÚNG hay SAI?`);
    if (isCorrect) {
      gameshow.modifyScore(curTeam.id, points, 'Đoán đúng Bức tranh tổng thể');
      gameshow.r1OpenedTiles.fill(true);
      gameshow.markStationCompleted('M01');
      sfx.playSuccess();
      sfx.playGong();
      this.showScoreToast(
        curTeam.name,
        points,
        `🎉 CHÚC MỪNG ${curTeam.name} ĐÃ ĐOÁN ĐÚNG BỨC TRANH BÍ ẨN VÀ GIÀNH ĐƯỢC CHÌA KHÓA VÒNG 1!`
      );
    } else {
      curTeam.isEliminatedInRound1 = true;
      sfx.playFailure();
      alert(`${curTeam.name} đoán sai và BỊ LOẠI khỏi Vòng 1!`);
    }
    this.render();
  }
}
