import Phaser from 'phaser';
import { session } from '../core/SessionStore';
import { element, button, ui } from '../ui/OverlayController';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    ui.bind({}); ui.hideHud(); ui.toast('');
    this.cameras.main.setBackgroundColor('#142d27');
    const { width, height } = this.cameras.main;
    this.add.tileSprite(0, 0, width, height, 'grass-tile').setOrigin(0).setAlpha(0.25);
    for (const [x, y] of [[0.07, 0.16], [0.9, 0.2], [0.85, 0.8], [0.08, 0.84]]) {
      this.add.image(width * x, height * y, 'supplied-biome-3', 'banyan-tree').setDisplaySize(200, 180);
    }

    const journal = element('section', 'title-journal');
    
    // Top ethnic badge & title
    const banner = element('div', 'title-ethnic-banner');
    banner.append(
      element('span', 'title-ethnic-badge', '⭐ GAMESHOW VĂN HÓA DÂN TỘC VIỆT NAM ⭐'),
      element('h1', 'title-ethnic-h1', 'THANH ÂM ĐẠI NGÀN'),
      element('p', 'subtitle', 'Hành Trình Khám Phá & Tôn Vinh Bản Sắc 54 Dân Tộc Anh Em')
    );
    journal.append(banner);

    // 4 Stations Preview Grid
    const preview = element('div', 'title-ethnic-stations-preview');
    preview.innerHTML = `
      <div class="title-station-item">
        <span>🏮</span>
        <div><strong>Lán Trại 1: Mảnh Ghép Thổ Cẩm</strong><br><small style="color:#9ec7b8">Lật 9 ô hoa văn giải mã Bức tranh bí ẩn</small></div>
      </div>
      <div class="title-station-item">
        <span>🎪</span>
        <div><strong>Lán Trại 2: Phiên Chợ Vùng Cao</strong><br><small style="color:#9ec7b8">Đấu thầu điểm cược 10–30 điểm theo chủ đề</small></div>
      </div>
      <div class="title-station-item">
        <span>🎵</span>
        <div><strong>Lán Trại 3: Tiếng Vang Đại Ngàn</strong><br><small style="color:#9ec7b8">Bấm chuông, nghe nhạc cụ & điền khuyết ca dao</small></div>
      </div>
      <div class="title-station-item">
        <span>🔥</span>
        <div><strong>Lán Trại 4: Lửa Thiêng Đại Ngàn</strong><br><small style="color:#9ec7b8">Đuốc Bạc (x2), Đuốc Vàng (x3) & Săn Mồi</small></div>
      </div>
    `;
    journal.append(preview);

    const start = () => {
      session.reset();
      this.scene.start('Hub');
    };

    const actions = element('div', 'button-row');
    const startBtn = button('🎮 BẮT ĐẦU HÀNH TRÌNH KHÁM PHÁ', start, 'btn-start-adventure');
    actions.append(startBtn);

    journal.append(actions);

    const footer = element('div', 'title-footer');
    footer.append(
      button(session.state.locale === 'vi' ? 'English' : 'Tiếng Việt', () => {
        session.configure(session.state.mode, session.state.locale === 'vi' ? 'en' : 'vi');
        this.scene.restart();
      }),
      button('Nguồn & Giới thiệu', () => ui.credits()),
      element('small', '', 'Dành cho màn hình máy chiếu lớp học & sân khấu')
    );
    ui.screen.append(journal, footer);
  }
}
