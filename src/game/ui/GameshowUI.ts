/**
 * Gameshow UI Controller for "Thanh Âm Đại Ngàn"
 * Implements interactive stages for Rounds 1-4, Grand Finale, 
 * live scoreboard, 4-5s result animations, and MC dock.
 */

import { GameshowEngine } from '../core/GameshowEngine';
import type { FunctionalCardType } from '../core/GameshowEngine';
import { sfx } from '../systems/SoundEffects';

import r1Data from '../../content/round1_thocam.json';
import r2Data from '../../content/round2_phiencho.json';
import r3Data from '../../content/round3_tiengvang.json';
import r4Data from '../../content/round4_luathieng.json';
import finaleData from '../../content/grand_finale.json';

import '../../styles/gameshow.css';

export class GameshowUI {
  private engine: GameshowEngine;
  private container: HTMLElement;
  private activeTeamIndex = 0;
  private activeQuestionIndex = 0;
  private activeRound: 1 | 2 | 3 | 4 | 'finale' = 1;

  // Round 2 Bids
  private r2Bids: Record<string, number> = {};

  // Round 3 Buzzers
  private r3BuzzedTeamId: string | null = null;
  private r3SecondBuzzedTeamId: string | null = null;

  // Round 4 Torches
  private r4Torches: Record<string, 'silver' | 'gold' | null> = {};

  constructor(teamNames?: string[]) {
    this.engine = new GameshowEngine(teamNames);
    
    // Find or create gameshow root element
    let root = document.getElementById('gameshow-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'gameshow-root';
      document.body.appendChild(root);
    }
    this.container = root;
    this.render();
  }

  /**
   * Main render method
   */
  render() {
    this.container.innerHTML = '';

    // 1. Header & Live Scoreboard
    const header = this.createHeader();
    this.container.appendChild(header);

    // 2. Stage based on active round
    const stage = document.createElement('div');
    stage.className = 'gs-stage';

    if (this.activeRound === 1) {
      stage.appendChild(this.createRound1Stage());
    } else if (this.activeRound === 2) {
      stage.appendChild(this.createRound2Stage());
    } else if (this.activeRound === 3) {
      stage.appendChild(this.createRound3Stage());
    } else if (this.activeRound === 4) {
      stage.appendChild(this.createRound4Stage());
    } else if (this.activeRound === 'finale') {
      stage.appendChild(this.createFinaleStage());
    }

    this.container.appendChild(stage);

    // 3. MC Controller Dock (bottom)
    const mcDock = this.createMCDock();
    this.container.appendChild(mcDock);
  }

  // ==========================================================================
  // HEADER & LIVE SCOREBOARD
  // ==========================================================================
  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'gs-header';

    const titleBadge = document.createElement('div');
    titleBadge.className = 'gs-title-badge';

    const title = document.createElement('div');
    title.className = 'gs-game-title';
    title.textContent = 'THANH ÂM ĐẠI NGÀN';

    const roundSubtitle = document.createElement('div');
    roundSubtitle.className = 'gs-round-badge';
    if (this.activeRound === 1) roundSubtitle.textContent = 'VÒNG 1: MẢNH GHÉP THỔ CẨM';
    else if (this.activeRound === 2) roundSubtitle.textContent = 'VÒNG 2: PHIÊN CHỢ VÙNG CAO';
    else if (this.activeRound === 3) roundSubtitle.textContent = 'VÒNG 3: TIẾNG VANG ĐẠI NGÀN';
    else if (this.activeRound === 4) roundSubtitle.textContent = 'VÒNG 4: LỬA THIÊNG ĐẠI NGÀN';
    else roundSubtitle.textContent = 'ĐẠI KẾT CỤC: BỨC TRANH ĐẠI ĐOÀN KẾT';

    titleBadge.appendChild(title);
    titleBadge.appendChild(roundSubtitle);
    header.appendChild(titleBadge);

    // Scoreboard
    const scoreboard = document.createElement('div');
    scoreboard.className = 'gs-scoreboard';

    this.engine.teams.forEach((team, idx) => {
      const card = document.createElement('div');
      card.className = `gs-team-card ${idx === this.activeTeamIndex ? 'active-turn' : ''} ${team.isEliminatedInRound1 && this.activeRound === 1 ? 'eliminated' : ''}`;
      card.style.borderColor = team.color;

      const name = document.createElement('div');
      name.className = 'gs-team-name';
      name.textContent = team.name;

      const score = document.createElement('div');
      score.className = 'gs-team-score';
      score.textContent = String(team.score);

      // Card inventory chips
      const inv = document.createElement('div');
      inv.className = 'gs-team-inventory';

      // Steal card
      const chipSteal = document.createElement('span');
      chipSteal.className = `gs-card-chip ${team.cards.steal_points > 0 ? 'available' : 'used'}`;
      chipSteal.title = 'Thẻ Cướp Điểm (20đ)';
      chipSteal.textContent = `⚡${team.cards.steal_points}`;

      // Block turn card
      const chipBlock = document.createElement('span');
      chipBlock.className = `gs-card-chip ${team.cards.block_turn > 0 ? 'available' : 'used'}`;
      chipBlock.title = 'Thẻ Cấm Lượt';
      chipBlock.textContent = `🔒${team.cards.block_turn}`;

      // Shield card
      const chipShield = document.createElement('span');
      chipShield.className = `gs-card-chip ${team.cards.shield > 0 ? 'available' : 'used'}`;
      chipShield.title = 'Thẻ Khiên Bảo Vệ';
      chipShield.textContent = `🛡️${team.cards.shield}`;

      inv.appendChild(chipSteal);
      inv.appendChild(chipBlock);
      inv.appendChild(chipShield);

      card.appendChild(name);
      card.appendChild(score);
      card.appendChild(inv);
      scoreboard.appendChild(card);
    });

    header.appendChild(scoreboard);
    return header;
  }

  // ==========================================================================
  // ROUND 1: MẢNH GHÉP THỔ CẨM
  // ==========================================================================
  private createRound1Stage(): HTMLElement {
    const layout = document.createElement('div');
    layout.className = 'gs-r1-layout';

    // Left: Mosaic Container with secret image and 3x3 tiles
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
      const isOpened = this.engine.r1OpenedTiles[i];
      tile.className = `gs-mosaic-tile ${isOpened ? 'opened' : ''}`;

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
          this.activeQuestionIndex = i;
          sfx.playBuzzer();
          this.render();
        }
      });

      grid.appendChild(tile);
    }
    mosaicBox.appendChild(grid);

    // Left column wrapper
    const leftCol = document.createElement('div');
    leftCol.appendChild(mosaicBox);

    // Guess painting button
    const guessPoints = this.engine.getRound1PictureGuessPoints();
    const guessBtn = document.createElement('button');
    guessBtn.className = 'gs-guess-painting-btn';
    guessBtn.textContent = `🔔 ĐOÁN BỨC TRANH TỔNG THỂ (+${guessPoints} ĐIỂM)`;
    guessBtn.addEventListener('click', () => this.handleGuessSecretPainting());
    leftCol.appendChild(guessBtn);

    layout.appendChild(leftCol);

    // Right: Question Panel
    const q = r1Data.questions[this.activeQuestionIndex];
    const rightCol = this.createQuestionCard(q, 'MẢNH GHÉP SỐ ' + (this.activeQuestionIndex + 1));
    layout.appendChild(rightCol);

    return layout;
  }

  // ==========================================================================
  // ROUND 2: PHIÊN CHỢ VÙNG CAO
  // ==========================================================================
  private createRound2Stage(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';

    const q = r2Data.questions[this.activeQuestionIndex % r2Data.questions.length];

    // Bidding Box
    const bidBox = document.createElement('div');
    bidBox.className = 'gs-r2-bid-box';
    bidBox.innerHTML = `<div>ĐẤU THẦU ĐIỂM CƯỢC THEO CHỦ ĐỀ: <strong style="color:var(--gs-gold)">${q.theme}</strong></div>`;

    const bidRow = document.createElement('div');
    bidRow.className = 'gs-bid-row';

    const currentTeam = this.engine.teams[this.activeTeamIndex];
    const currentBid = this.r2Bids[currentTeam.id] || 10;

    [10, 15, 20, 25, 30].forEach((amount) => {
      const chip = document.createElement('div');
      chip.className = `gs-bid-chip ${currentBid === amount ? 'active' : ''}`;
      chip.textContent = `${amount} điểm`;
      chip.addEventListener('click', () => {
        this.r2Bids[currentTeam.id] = amount;
        sfx.playBuzzer();
        this.render();
      });
      bidRow.appendChild(chip);
    });

    bidBox.appendChild(bidRow);
    wrapper.appendChild(bidBox);

    // Question Panel
    const qPanel = this.createQuestionCard(q, `CHỦ ĐỀ: ${q.theme}`);
    wrapper.appendChild(qPanel);

    return wrapper;
  }

  // ==========================================================================
  // ROUND 3: TIẾNG VANG ĐẠI NGÀN
  // ==========================================================================
  private createRound3Stage(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';

    const q = r3Data.questions[this.activeQuestionIndex % r3Data.questions.length];

    // Audio Visualizer if question is audio type
    if (q.type === 'audio') {
      const visualizer = document.createElement('div');
      visualizer.className = 'gs-audio-visualizer';
      for (let i = 0; i < 5; i++) {
        const bar = document.createElement('div');
        bar.className = 'gs-audio-bar';
        visualizer.appendChild(bar);
      }

      const playAudioBtn = document.createElement('button');
      playAudioBtn.className = 'gs-mc-btn action';
      playAudioBtn.style.margin = '0 auto';
      playAudioBtn.textContent = '🔊 PHÁT THANH ÂM NHẠC CỤ';
      playAudioBtn.addEventListener('click', () => {
        if (q.audio_type === 'dan_tinh') sfx.playDanTinhSample();
        else if (q.audio_type === 'khen_mong') sfx.playKhenMongSample();
        else sfx.playGong();
      });

      wrapper.appendChild(visualizer);
      wrapper.appendChild(playAudioBtn);
    }

    // Buzzers Row
    const buzzerRow = document.createElement('div');
    buzzerRow.className = 'gs-buzzer-row';

    this.engine.teams.forEach((team) => {
      const btn = document.createElement('button');
      const isFirst = this.r3BuzzedTeamId === team.id;
      btn.className = `gs-buzzer-btn ${isFirst ? 'buzzed' : ''}`;
      btn.textContent = isFirst ? `🔔 ${team.name} ĐÃ BẤM CHUÔNG!` : `Bấm chuông: ${team.name}`;
      btn.addEventListener('click', () => {
        if (!this.r3BuzzedTeamId) {
          this.r3BuzzedTeamId = team.id;
          sfx.playBuzzer();
          this.render();
        } else if (!this.r3SecondBuzzedTeamId && this.r3BuzzedTeamId !== team.id) {
          this.r3SecondBuzzedTeamId = team.id;
          sfx.playBuzzer();
        }
      });
      buzzerRow.appendChild(btn);
    });

    wrapper.appendChild(buzzerRow);

    // Question Panel
    const qPanel = this.createQuestionCard(q, q.type === 'audio' ? 'NHẬN DIỆN ÂM THANH' : 'ĐIỀN KHUYẾT CA DAO');
    wrapper.appendChild(qPanel);

    return wrapper;
  }

  // ==========================================================================
  // ROUND 4: LỬA THIÊNG ĐẠI NGÀN
  // ==========================================================================
  private createRound4Stage(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.height = '100%';

    const currentTeam = this.engine.teams[this.activeTeamIndex];
    const currentTorch = this.r4Torches[currentTeam.id] || null;

    // Torches selection row
    const torchRow = document.createElement('div');
    torchRow.className = 'gs-torch-row';

    const silverBtn = document.createElement('div');
    silverBtn.className = `gs-torch-card gs-torch-silver ${currentTorch === 'silver' ? 'active' : ''}`;
    silverBtn.textContent = '🥈 THẺ ĐUỐC BẠC (x2 ĐIỂM)';
    silverBtn.addEventListener('click', () => {
      this.r4Torches[currentTeam.id] = currentTorch === 'silver' ? null : 'silver';
      sfx.playCardActivate();
      this.render();
    });

    const goldBtn = document.createElement('div');
    goldBtn.className = `gs-torch-card gs-torch-gold ${currentTorch === 'gold' ? 'active' : ''}`;
    goldBtn.textContent = '🥇 THẺ ĐUỐC VÀNG (x3 ĐIỂM)';
    goldBtn.addEventListener('click', () => {
      this.r4Torches[currentTeam.id] = currentTorch === 'gold' ? null : 'gold';
      sfx.playCardActivate();
      this.render();
    });

    torchRow.appendChild(silverBtn);
    torchRow.appendChild(goldBtn);
    wrapper.appendChild(torchRow);

    // Prey Pot Alert if > 0
    if (this.engine.preyPot > 0) {
      const pot = document.createElement('div');
      pot.className = 'gs-prey-pot';
      pot.innerHTML = `⚠️ <strong>QUỸ SĂN MỒI: +${this.engine.preyPot} ĐIỂM!</strong> (Chuông đang mở cho các đội cướp điểm!)`;
      wrapper.appendChild(pot);
    }

    const q = r4Data.questions[this.activeQuestionIndex % r4Data.questions.length];
    const qPanel = this.createQuestionCard(q, `CHUNG KẾT · ĐỘ KHÓ: ${q.difficulty}`);
    wrapper.appendChild(qPanel);

    return wrapper;
  }

  // ==========================================================================
  // GRAND FINALE: BỨC TRANH ĐẠI ĐOÀN KẾT TOÀN DÂN TỘC
  // ==========================================================================
  private createFinaleStage(): HTMLElement {
    const layout = document.createElement('div');
    layout.className = 'gs-finale-container';

    // Left: Giant Masterpiece Image
    const leftCol = document.createElement('div');
    const imgBox = document.createElement('div');
    imgBox.className = 'gs-finale-img-box';

    const img = document.createElement('img');
    img.src = finaleData.image;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    imgBox.appendChild(img);
    leftCol.appendChild(imgBox);

    const quote = document.createElement('div');
    quote.className = 'gs-finale-quote';
    quote.textContent = `${finaleData.quote} — ${finaleData.author}`;
    leftCol.appendChild(quote);

    layout.appendChild(leftCol);

    // Right: Challenge Question for Individual
    const rightCol = document.createElement('div');
    rightCol.className = 'gs-question-panel';

    const theme = document.createElement('div');
    theme.className = 'gs-q-theme';
    theme.textContent = '🌟 THỬ THÁCH DANH DỰ ĐẶC BIỆT DÀNH CHO CÁ NHÂN';

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
          this.showIndividualRewardModal();
        } else {
          btn.classList.add('incorrect');
          sfx.playFailure();
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
  // QUESTION CARD COMPONENT
  // ==========================================================================
  private createQuestionCard(q: { question: string; options?: string[]; correct_index?: number; explanation?: string }, subtitle: string): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'gs-question-panel';

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
          btn.classList.toggle('selected');
        });
        optGrid.appendChild(btn);
      });
    }

    panel.appendChild(theme);
    panel.appendChild(text);
    panel.appendChild(optGrid);

    return panel;
  }

  // ==========================================================================
  // MC CONTROL DOCK (Thanh điều khiển nhanh của MC)
  // ==========================================================================
  private createMCDock(): HTMLElement {
    const dock = document.createElement('div');
    dock.className = 'gs-mc-dock';

    // Left info
    const info = document.createElement('div');
    info.style.fontSize = '13px';
    info.style.fontWeight = '700';
    info.style.color = 'var(--gs-gold)';
    const curTeam = this.engine.teams[this.activeTeamIndex];
    info.textContent = `ĐANG THỰC HIỆN: ${curTeam.name.toUpperCase()}`;
    dock.appendChild(info);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'gs-mc-controls';

    // Button: [ĐÚNG]
    const btnCorrect = document.createElement('button');
    btnCorrect.className = 'gs-mc-btn correct';
    btnCorrect.textContent = '✔ ĐÚNG';
    btnCorrect.addEventListener('click', () => this.handleAnswerResult(true));

    // Button: [SAI]
    const btnIncorrect = document.createElement('button');
    btnIncorrect.className = 'gs-mc-btn incorrect';
    btnIncorrect.textContent = '✖ SAI';
    btnIncorrect.addEventListener('click', () => this.handleAnswerResult(false));

    // Button: [KÍCH HOẠT THẺ]
    const btnUseCard = document.createElement('button');
    btnUseCard.className = 'gs-mc-btn action';
    btnUseCard.textContent = '⚡ KÍCH HOẠT THẺ';
    btnUseCard.addEventListener('click', () => this.showCardActivationModal());

    // Button: [CHỌN ĐỘI TIẾP]
    const btnNextTeam = document.createElement('button');
    btnNextTeam.className = 'gs-mc-btn action';
    btnNextTeam.textContent = '🔄 ĐỔI LƯỢT ĐỘI';
    btnNextTeam.addEventListener('click', () => {
      this.activeTeamIndex = (this.activeTeamIndex + 1) % this.engine.teams.length;
      this.render();
    });

    // Button: [CHUYỂN VÒNG THI]
    const btnNextRound = document.createElement('button');
    btnNextRound.className = 'gs-mc-btn action';
    btnNextRound.textContent = '⏩ CHUYỂN VÒNG';
    btnNextRound.addEventListener('click', () => this.handleNextRound());

    controls.appendChild(btnCorrect);
    controls.appendChild(btnIncorrect);
    controls.appendChild(btnUseCard);
    controls.appendChild(btnNextTeam);
    controls.appendChild(btnNextRound);

    dock.appendChild(controls);
    return dock;
  }

  // ==========================================================================
  // ANSWER LOGIC & 4-5S RESULT SEQUENCE
  // ==========================================================================
  private handleAnswerResult(isCorrect: boolean) {
    const curTeam = this.engine.teams[this.activeTeamIndex];
    let delta = 0;
    let cardAwarded: FunctionalCardType | null = null;
    let explanation = '';

    if (this.activeRound === 1) {
      const q = r1Data.questions[this.activeQuestionIndex];
      explanation = q?.explanation || '';
      if (isCorrect) {
        delta = 10;
        this.engine.r1OpenedTiles[this.activeQuestionIndex] = true;
        this.engine.r1AnsweredCount++;
        if (q && q.has_card) {
          cardAwarded = q.has_card as FunctionalCardType;
          this.engine.awardCard(curTeam.id, cardAwarded);
        }
      } else {
        delta = -10;
      }
    } else if (this.activeRound === 2) {
      const q = r2Data.questions[this.activeQuestionIndex % r2Data.questions.length];
      explanation = q?.explanation || '';
      const bid = this.r2Bids[curTeam.id] || 10;
      delta = isCorrect ? bid : -bid;

      if (isCorrect && q && q.has_card) {
        cardAwarded = q.has_card as FunctionalCardType;
        this.engine.awardCard(curTeam.id, cardAwarded);
      }
    } else if (this.activeRound === 3) {
      const q = r3Data.questions[this.activeQuestionIndex % r3Data.questions.length];
      explanation = q?.explanation || '';
      if (isCorrect) {
        delta = 20;
        if (q && q.has_card) {
          cardAwarded = q.has_card as FunctionalCardType;
          this.engine.awardCard(curTeam.id, cardAwarded);
        }
      } else {
        delta = -10;
      }
    } else if (this.activeRound === 4) {
      const q = r4Data.questions[this.activeQuestionIndex % r4Data.questions.length];
      explanation = q?.explanation || '';
      const torch = this.r4Torches[curTeam.id];

      if (!torch) {
        delta = isCorrect ? 20 : -10;
      } else if (torch === 'silver') {
        delta = isCorrect ? 40 : -40;
      } else if (torch === 'gold') {
        delta = isCorrect ? 60 : -60;
      }

      // Check Prey Mechanism
      if (!isCorrect && (torch === 'silver' || torch === 'gold')) {
        this.engine.preyPot = Math.abs(delta);
        sfx.playPreyWarning();
      }

      if (isCorrect && q && q.has_card) {
        cardAwarded = q.has_card as FunctionalCardType;
        this.engine.awardCard(curTeam.id, cardAwarded);
      }
    }

    this.engine.modifyScore(curTeam.id, delta, isCorrect ? 'Trả lời đúng' : 'Trả lời sai');
    if (isCorrect) sfx.playSuccess();
    else sfx.playFailure();

    // Trigger 4-5s Result Sequence Overlay
    this.showResultSequence(curTeam.name, delta, explanation, cardAwarded);
  }

  /**
   * 4-5 Second Result Sequence Screen
   */
  private showResultSequence(teamName: string, delta: number, explanation: string, cardAwarded: FunctionalCardType | null) {
    const overlay = document.createElement('div');
    overlay.className = 'gs-result-overlay';

    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = `gs-floating-score ${delta >= 0 ? 'plus' : 'minus'}`;
    scoreDisplay.textContent = delta >= 0 ? `+${delta}` : `${delta}`;

    const teamTitle = document.createElement('div');
    teamTitle.className = 'gs-result-team-name';
    teamTitle.textContent = teamName;

    const expText = document.createElement('div');
    expText.className = 'gs-result-explanation';
    expText.textContent = explanation;

    overlay.appendChild(scoreDisplay);
    overlay.appendChild(teamTitle);
    overlay.appendChild(expText);

    if (cardAwarded) {
      const cardMsg = document.createElement('div');
      cardMsg.style.color = 'var(--gs-gold)';
      cardMsg.style.fontWeight = '800';
      cardMsg.style.fontSize = '18px';
      cardMsg.style.marginTop = '10px';
      cardMsg.textContent = `⭐ NHẬN ĐƯỢC THẺ CHỨC NĂNG: ${cardAwarded.toUpperCase()}!`;
      overlay.appendChild(cardMsg);
      sfx.playCardActivate();
    }

    const timer = document.createElement('div');
    timer.className = 'gs-result-timer';
    let timeLeft = 4;
    timer.textContent = `Tiếp tục sau ${timeLeft}s... (Click để bỏ qua)`;
    overlay.appendChild(timer);

    this.container.appendChild(overlay);

    const interval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(interval);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        this.nextQuestion();
      } else {
        timer.textContent = `Tiếp tục sau ${timeLeft}s... (Click để bỏ qua)`;
      }
    }, 1000);

    overlay.addEventListener('click', () => {
      clearInterval(interval);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      this.nextQuestion();
    });
  }

  private nextQuestion() {
    this.activeQuestionIndex++;
    this.activeTeamIndex = (this.activeTeamIndex + 1) % this.engine.teams.length;
    this.r3BuzzedTeamId = null;
    this.r3SecondBuzzedTeamId = null;
    this.engine.consumeBlockedTurns();
    this.render();
  }

  // ==========================================================================
  // GUESS SECRET PAINTING MODAL (Round 1)
  // ==========================================================================
  private handleGuessSecretPainting() {
    const curTeam = this.engine.teams[this.activeTeamIndex];
    const points = this.engine.getRound1PictureGuessPoints();
    const confirmed = window.confirm(
      `${curTeam.name} muốn đoán bức tranh tổng thể (+${points} điểm nếu đúng, BỊ LOẠI khỏi Vòng 1 nếu sai)?`
    );
    if (!confirmed) return;

    const answer = window.prompt(`Nhập tên bức tranh hoặc bấm OK nếu trả lời miệng với MC:`, '');
    if (answer === null) return;

    const isCorrect = window.confirm(`MC xác nhận: ${curTeam.name} trả lời ĐÚNG hay SAI?`);
    if (isCorrect) {
      this.engine.modifyScore(curTeam.id, points, 'Đoán đúng Bức tranh tổng thể');
      this.engine.r1OpenedTiles.fill(true);
      sfx.playSuccess();
      alert(`CHÚC MỪNG ${curTeam.name} ĐÃ ĐOÁN ĐÚNG VÀ GIÀNH TRỌN +${points} ĐIỂM!`);
    } else {
      curTeam.isEliminatedInRound1 = true;
      sfx.playFailure();
      alert(`${curTeam.name} đoán sai và BỊ LOẠI khỏi Vòng 1!`);
    }
    this.render();
  }

  // ==========================================================================
  // FUNCTIONAL CARD ACTIVATION MODAL
  // ==========================================================================
  private showCardActivationModal() {
    const curTeam = this.engine.teams[this.activeTeamIndex];
    const availableCards = Object.entries(curTeam.cards).filter(([, count]) => count > 0);
    if (!availableCards.length) {
      alert(`${curTeam.name} hiện chưa có thẻ chức năng nào!`);
      return;
    }

    const cardType = window.prompt(
      `Chọn loại thẻ kích hoạt:\n1: Thẻ Cướp Điểm (còn ${curTeam.cards.steal_points})\n2: Thẻ Cấm Lượt (còn ${curTeam.cards.block_turn})\n3: Thẻ Khiên (tự kích hoạt khi bị nhắm)`,
      '1'
    );

    if (cardType === '1' && curTeam.cards.steal_points > 0) {
      const otherTeams = this.engine.teams.filter((t) => t.id !== curTeam.id);
      const targetList = otherTeams.map((t, idx) => `${idx + 1}: ${t.name}`).join('\n');
      const choice = window.prompt(`Chọn đội đối thủ để cướp 20 điểm:\n${targetList}`, '1');
      const targetIdx = parseInt(choice || '1', 10) - 1;
      const targetTeam = otherTeams[targetIdx];

      if (targetTeam) {
        const result = this.engine.useStealPointsCard(curTeam.id, targetTeam.id);
        sfx.playCardActivate();
        alert(result.message);
        this.render();
      }
    } else if (cardType === '2' && curTeam.cards.block_turn > 0) {
      const otherTeams = this.engine.teams.filter((t) => t.id !== curTeam.id);
      const targetList = otherTeams.map((t, idx) => `${idx + 1}: ${t.name}`).join('\n');
      const choice = window.prompt(`Chọn đội đối thủ để cấm lượt câu tiếp:\n${targetList}`, '1');
      const targetIdx = parseInt(choice || '1', 10) - 1;
      const targetTeam = otherTeams[targetIdx];

      if (targetTeam) {
        const result = this.engine.useBlockTurnCard(curTeam.id, targetTeam.id);
        sfx.playCardActivate();
        alert(result.message);
        this.render();
      }
    }
  }

  // ==========================================================================
  // ROUND PROGRESSION & FINALE REWARD
  // ==========================================================================
  private handleNextRound() {
    if (this.activeRound === 1) this.activeRound = 2;
    else if (this.activeRound === 2) this.activeRound = 3;
    else if (this.activeRound === 3) this.activeRound = 4;
    else if (this.activeRound === 4) this.activeRound = 'finale';

    this.activeQuestionIndex = 0;
    sfx.playGong();
    this.render();
  }

  private showIndividualRewardModal() {
    alert(
      `🏆 ${finaleData.challenge_question.special_reward_title} 🏆\n\n${finaleData.challenge_question.special_reward_message}`
    );
  }
}
