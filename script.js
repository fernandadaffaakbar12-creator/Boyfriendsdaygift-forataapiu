// ==========================================
// 0. ANIMASI LOADING "I LOVE YOU" MEMBENTUK HATI
// ==========================================
(function () {
    function initMiniGame() {
        const gameArea = document.getElementById('game-area');
        const player = document.getElementById('player-obj');
        const miniGameScreen = document.getElementById('mini-game-screen');
        const progressFill = document.getElementById('game-progress-fill');
        const safePath = document.getElementById('safe-path');
        const sparkleContainer = gameArea ? gameArea.querySelector('.track-sparkles') : null;

        if (!gameArea || !player || !miniGameScreen || !safePath) return;

        let isDragging = false;
        let currentPathLength = 0;
        let pendingClientX = 0;
        let pendingClientY = 0;
        let rafId = null;
        let sparkleCounter = 0;

        // Offset player: tengah cart
        const CART_HALF_W = 24;
        const CART_HALF_H = 26;

        // =============================================
        // PRE-CACHE: Hitung semua titik path SEKALI saat init
        // Ini menghindari getPointAtLength() saat drag
        // =============================================
        const totalLength = safePath.getTotalLength();
        const SAMPLES = 200;
        const cachedPoints = []; // Array of { x, y, len }

        for (let i = 0; i <= SAMPLES; i++) {
            const len = (i / SAMPLES) * totalLength;
            const pt = safePath.getPointAtLength(len);
            cachedPoints.push({ x: pt.x, y: pt.y, len: len });
        }

        // Cache monster elements
        const monsters = gameArea.querySelectorAll('.monster');

        // Background particles
        createBgParticles();

        function createBgParticles() {
            const container = miniGameScreen.querySelector('.game-bg-particles');
            if (!container) return;
            for (let i = 0; i < 25; i++) {
                const p = document.createElement('div');
                p.classList.add('game-bg-particle');
                p.style.left = Math.random() * 100 + '%';
                p.style.top = Math.random() * 100 + '%';
                p.style.animationDelay = (Math.random() * 6) + 's';
                p.style.animationDuration = (4 + Math.random() * 4) + 's';
                p.style.width = (2 + Math.random() * 4) + 'px';
                p.style.height = p.style.width;
                container.appendChild(p);
            }
        }

        function createTrackSparkle(pixX, pixY) {
            if (!sparkleContainer) return;
            const s = document.createElement('div');
            s.className = 'track-sparkle';
            s.style.cssText = 'left:' + (pixX + (Math.random() - 0.5) * 16) + 'px;top:' + (pixY + (Math.random() - 0.5) * 16) + 'px';
            sparkleContainer.appendChild(s);
            setTimeout(() => s.remove(), 1500);
        }

        // Cari titik terdekat dari cached points (SANGAT CEPAT - hanya array loop)
        function findClosestCached(svgX, svgY) {
            let bestDist = Infinity;
            let bestIdx = 0;

            for (let i = 0; i < cachedPoints.length; i++) {
                const p = cachedPoints[i];
                const dx = p.x - svgX;
                const dy = p.y - svgY;
                const d = dx * dx + dy * dy;
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }

            return cachedPoints[bestIdx];
        }

        // Letakkan player di titik path
        function placePlayer(svgX, svgY, len) {
            const rect = gameArea.getBoundingClientRect();
            const pixX = (svgX / 500) * rect.width;
            const pixY = (svgY / 250) * rect.height;

            player.style.left = (pixX - CART_HALF_W) + 'px';
            player.style.top = (pixY - CART_HALF_H) + 'px';

            currentPathLength = len;

            // Progress bar
            if (progressFill) {
                progressFill.style.width = ((len / totalLength) * 100) + '%';
            }

            // Sparkle hanya setiap 3 frame
            sparkleCounter++;
            if (sparkleCounter % 3 === 0) {
                createTrackSparkle(pixX, pixY);
            }

            return { pixX, pixY };
        }

        function resetPlayer() {
            currentPathLength = 0;
            const p = cachedPoints[0];
            placePlayer(p.x, p.y, 0);
            player.style.transform = 'scale(1)';
            isDragging = false;
            if (progressFill) progressFill.style.width = '0%';
            if (navigator.vibrate) navigator.vibrate(200);
        }

        function checkMonsterCollision(pixX, pixY) {
            const aRect = gameArea.getBoundingClientRect();

            for (const monster of monsters) {
                const mRect = monster.getBoundingClientRect();
                const mx = (mRect.left + mRect.width * 0.5) - aRect.left;
                const my = (mRect.top + mRect.height * 0.5) - aRect.top;
                const dx = pixX - mx;
                const dy = pixY - my;

                if (dx * dx + dy * dy < 324) { // 18^2 = 324
                    resetPlayer();
                    return true;
                }
            }
            return false;
        }

        function checkFinish() {
            if (currentPathLength >= totalLength * 0.95) {
                isDragging = false;
                setTimeout(() => {
                    miniGameScreen.style.transition = 'opacity 1s ease';
                    miniGameScreen.style.opacity = '0';
                    setTimeout(() => {
                        miniGameScreen.style.display = 'none';
                        const landingPage = document.getElementById('landing-page');
                        if (landingPage) landingPage.style.display = '';
                    }, 1000);
                }, 300);
                return true;
            }
            return false;
        }

        // Frame update — dipanggil via requestAnimationFrame
        function frameUpdate() {
            rafId = null;
            if (!isDragging) return;

            const rect = gameArea.getBoundingClientRect();
            // Konversi client coords ke SVG coords
            const svgX = ((pendingClientX - rect.left) / rect.width) * 500;
            const svgY = ((pendingClientY - rect.top) / rect.height) * 250;

            // Cari titik terdekat (super cepat, hanya array loop)
            const closest = findClosestCached(svgX, svgY);

            // Letakkan player
            const { pixX, pixY } = placePlayer(closest.x, closest.y, closest.len);

            // Cek tabrakan
            if (checkMonsterCollision(pixX, pixY)) return;
            checkFinish();
        }

        // Trigger frame update (throttled via rAF)
        function scheduleUpdate(clientX, clientY) {
            pendingClientX = clientX;
            pendingClientY = clientY;
            if (!rafId) {
                rafId = requestAnimationFrame(frameUpdate);
            }
        }

        // Inisialisasi posisi awal
        const startPt = cachedPoints[0];
        placePlayer(startPt.x, startPt.y, 0);

        // --- Mouse Events ---
        player.addEventListener('mousedown', (e) => {
            isDragging = true;
            player.style.transform = 'scale(1.08)';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            scheduleUpdate(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                player.style.transform = 'scale(1)';
            }
        });

        // --- Touch Events ---
        player.addEventListener('touchstart', (e) => {
            isDragging = true;
            player.style.transform = 'scale(1.08)';
            e.preventDefault();
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const t = e.touches[0];
            scheduleUpdate(t.clientX, t.clientY);
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                player.style.transform = 'scale(1)';
            }
        });
    }

    function initPinLogic() {
        // ==========================================
        // PIN VALIDATION LOGIC (Pop-Up Notifikasi)
        // ==========================================
        const pinInput = document.getElementById('pin-input');
        const pinPopupOverlay = document.getElementById('pin-popup-overlay');
        const pinPopupBox = document.getElementById('pin-popup-box');
        const pinPopupImg = document.getElementById('pin-popup-img');
        const pinPopupEmoji = document.getElementById('pin-popup-emoji');
        const pinPopupMsg = document.getElementById('pin-popup-msg');
        const pinPopupClose = document.getElementById('pin-popup-close');

        // PIN RAHASIA: 6 digit (270824)
        const SECRET_PIN = "270824";

        let pinAttempt = 0;
        let popupTimeout = null;

        // Konfigurasi pesan & tampilan setiap percobaan salah
        const wrongConfigs = [
            {
                // Percobaan pertama: tampilkan foto kucing
                showCat: true,
                emoji: '',
                message: 'Masa tanggal spesial kita lupa?',
                buttonText: 'Iya iya maaf 😭'
            },
            {
                // Percobaan kedua: foto kucing marah
                showCat: true,
                catSrc: 'img/cat-angry.png',
                emoji: '',
                message: 'Serius lupa?!\nYaudah coba lagi deh.',
                buttonText: 'Sekali lagi 🙏'
            },
            {
                // Percobaan ketiga+: foto kucing thumbs up
                showCat: true,
                catSrc: 'img/cat-thumbsup.png',
                emoji: '',
                message: 'Kalau masih salah,\nketerlaluan sih.',
                buttonText: 'Ampun 😭'
            }
        ];

        function showPinPopup(config, isSuccess) {
            // Bersihkan timeout sebelumnya
            if (popupTimeout) clearTimeout(popupTimeout);

            // Reset semua state
            pinPopupBox.classList.remove('popup-success', 'shake-popup');
            pinPopupImg.classList.remove('wiggle-cat', 'hidden-img');
            pinPopupEmoji.classList.remove('show-emoji');
            pinPopupEmoji.textContent = '';

            if (isSuccess) {
                // Tampilan sukses — pakai foto kucing senang
                pinPopupImg.src = 'img/cat-succes.png';
                pinPopupImg.classList.remove('hidden-img');
                pinPopupBox.classList.add('popup-success');
                pinPopupMsg.textContent = config.message;
                pinPopupClose.textContent = config.buttonText;
                setTimeout(() => {
                    pinPopupImg.classList.add('wiggle-cat');
                }, 400);
            } else {
                // Tampilan salah
                if (config.showCat) {
                    // Tampilkan gambar kucing + animasi wiggle
                    pinPopupImg.src = config.catSrc || 'img/cat-warning.png';
                    pinPopupImg.classList.remove('hidden-img');
                    setTimeout(() => {
                        pinPopupImg.classList.add('wiggle-cat');
                    }, 400);
                } else {
                    // Sembunyikan gambar, tampilkan emoji
                    pinPopupImg.classList.add('hidden-img');
                    pinPopupEmoji.textContent = config.emoji;
                    pinPopupEmoji.classList.add('show-emoji');
                    // Tambah padding atas karena tidak ada gambar yang menonjol
                    pinPopupBox.style.paddingTop = '30px';
                }

                pinPopupMsg.textContent = config.message;
                pinPopupClose.textContent = config.buttonText;

                // Shake animation setelah muncul
                setTimeout(() => {
                    pinPopupBox.classList.add('shake-popup');
                }, 500);
            }

            // Tampilkan pop-up
            pinPopupOverlay.classList.add('show-popup');
        }

        function closePinPopup() {
            pinPopupOverlay.classList.remove('show-popup');
            if (popupTimeout) clearTimeout(popupTimeout);
            // Reset padding
            pinPopupBox.style.paddingTop = '';
        }

        // Event listener untuk tombol tutup
        if (pinPopupClose) {
            pinPopupClose.addEventListener('click', closePinPopup);
        }

        // Tutup pop-up dengan klik overlay (di luar box)
        if (pinPopupOverlay) {
            pinPopupOverlay.addEventListener('click', function (e) {
                if (e.target === pinPopupOverlay) {
                    closePinPopup();
                }
            });
        }

        if (pinInput) {
            pinInput.addEventListener('input', function () {
                if (pinInput.value.length === 6) {
                    // Delay sedikit agar digit terakhir terasa diketik
                    setTimeout(() => {
                        if (pinInput.value === SECRET_PIN) {
                            // PIN BENAR
                            showPinPopup({
                                message: 'Valid!\nLanjut ya sayang~',
                                buttonText: 'Lanjut 💕'
                            }, true);

                            // Auto-close dan lanjut setelah 2 detik
                            popupTimeout = setTimeout(() => {
                                closePinPopup();
                                setTimeout(() => {
                                    const pinScreen = document.getElementById('pin-screen');
                                    
                                    // 1. Fade out PIN screen
                                    pinScreen.classList.remove('active');

                                    // 2. Wait for fade out to complete (1 detik)
                                    setTimeout(() => {
                                        pinScreen.style.display = 'none';
                                        
                                        const loadingScreen = document.getElementById('mini-game-screen');
                                        if (loadingScreen) {
                                            loadingScreen.style.display = 'flex';
                                            
                                            // 3. Jeda sedikit lalu jalankan Fade in Mini Game
                                            setTimeout(() => {
                                                loadingScreen.style.opacity = '1';
                                                
                                                // 4. Inisialisasi game setelah mulai muncul
                                                initMiniGame();
                                            }, 50);
                                        }
                                    }, 1000);
                                }, 300);
                            }, 2000);

                            // Juga lanjut saat tombol diklik
                            pinPopupClose.onclick = function () {
                                closePinPopup();
                                setTimeout(() => {
                                    const pinScreen = document.getElementById('pin-screen');
                                    
                                    // 1. Fade out PIN screen
                                    pinScreen.classList.remove('active');

                                    // 2. Wait for fade out to complete (1 detik)
                                    setTimeout(() => {
                                        pinScreen.style.display = 'none';
                                        
                                        const loadingScreen = document.getElementById('mini-game-screen');
                                        if (loadingScreen) {
                                            loadingScreen.style.display = 'flex';
                                            
                                            // 3. Jeda sedikit lalu jalankan Fade in Mini Game
                                            setTimeout(() => {
                                                loadingScreen.style.opacity = '1';
                                                
                                                // 4. Inisialisasi game setelah mulai muncul
                                                initMiniGame();
                                            }, 50);
                                        }
                                    }, 1000);
                                }, 300);
                            };
                        } else {
                            // PIN SALAH
                            const configIndex = Math.min(pinAttempt, wrongConfigs.length - 1);
                            showPinPopup(wrongConfigs[configIndex], false);
                            pinAttempt++;

                            pinInput.classList.add('shake-animation');
                            setTimeout(() => pinInput.classList.remove('shake-animation'), 400);
                            pinInput.value = '';

                            // Reset tombol close ke default
                            pinPopupClose.onclick = closePinPopup;
                        }
                    }, 150);
                }
            });
        }
    }

    function buatSparkles(container, heartPoints, centerX, centerY) {
        const sparkleInterval = setInterval(() => {
            const sparkle = document.createElement('div');
            sparkle.classList.add('heart-sparkle');

            const randomPoint = heartPoints[Math.floor(Math.random() * heartPoints.length)];
            const offsetX = -15 + Math.random() * 30;
            const offsetY = -15 + Math.random() * 30;

            sparkle.style.left = (centerX + randomPoint.x + offsetX) + 'px';
            sparkle.style.top = (centerY + randomPoint.y + offsetY) + 'px';
            sparkle.style.animation = 'sparkleFloat ' + (1.5 + Math.random() * 1.5) + 's ease-out forwards';

            container.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 3000);
        }, 400);

        document.getElementById('love-loading-screen').addEventListener('click', () => {
            clearInterval(sparkleInterval);
        }, { once: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPinLogic);
    } else {
        initPinLogic();
    }
})();

// ==========================================
// 1. FUNGSI FOTO MEMBESAR (LIGHTBOX) & PEMUTAR MUSIK
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    const daftarFoto = document.querySelectorAll('.gallery-scroll img, .polaroid, .planet-card');
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalIframe = document.getElementById('modal-iframe'); // Panggil elemen iframe
    const modalCaption = document.getElementById('modal-caption');

    if (daftarFoto.length > 0 && modal && modalImg) {
        daftarFoto.forEach(foto => {
            foto.addEventListener('click', function () {

                // Reset layar setiap kali diklik
                if (modalCaption) modalCaption.innerText = "";
                modalImg.style.display = 'block'; // Tampilkan foto sebagai default
                modalIframe.style.display = 'none'; // Sembunyikan musik sebagai default
                modalIframe.src = ""; // Kosongkan lagu sebelumnya

                // A. JIKA YANG DIKLIK ADALAH KARTU LAGU/VIDEO (Punya data-embed)
                if (this.classList.contains('planet-card') && this.hasAttribute('data-embed')) {
                    modalImg.style.display = 'none'; // Sembunyikan foto
                    modalIframe.style.display = 'block'; // Tampilkan alat musik/video

                    const embedUrl = this.getAttribute('data-embed');
                    modalIframe.src = embedUrl; // Masukkan link

                    // Hapus class lama
                    modalIframe.classList.remove('iframe-spotify', 'iframe-youtube', 'iframe-facebook');

                    // Deteksi platform untuk penyesuaian rasio (16:9 untuk YouTube, Kotak untuk Spotify, 9:16 untuk Facebook)
                    if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
                        modalIframe.classList.add('iframe-youtube');
                    } else if (embedUrl.includes('spotify.com')) {
                        modalIframe.classList.add('iframe-spotify');
                    } else if (embedUrl.includes('facebook.com')) {
                        modalIframe.classList.add('iframe-facebook');
                    }

                    const customCaption = this.getAttribute('data-caption');
                    const teksCaption = customCaption ? customCaption : this.querySelector('.planet-caption').innerText;
                    if (modalCaption) modalCaption.innerText = teksCaption;
                }
                // B. JIKA YANG DIKLIK ADALAH KARTU 3D BIASA (Bukan Lagu)
                else if (this.classList.contains('planet-card')) {
                    modalImg.src = this.querySelector('img').src;
                    modalImg.style.aspectRatio = "3 / 4";

                    const customCaption = this.getAttribute('data-caption');
                    const teksCaption = customCaption ? customCaption : this.querySelector('.planet-caption').innerText;
                    if (modalCaption) modalCaption.innerText = teksCaption;
                }
                // C. JIKA YANG DIKLIK ADALAH POLAROID
                else if (this.classList.contains('polaroid')) {
                    modalImg.src = this.querySelector('img').src;
                    modalImg.style.aspectRatio = "9 / 16";
                    const customCaption = this.getAttribute('data-caption');
                    const cap = this.querySelector('.caption');
                    const teksCaption = customCaption ? customCaption : (cap ? cap.innerText : '');
                    if (modalCaption) modalCaption.innerText = teksCaption;
                }
                // D. JIKA YANG DIKLIK ADALAH GALERI CINTA
                else {
                    modalImg.src = this.src;
                    modalImg.style.aspectRatio = "9 / 16";
                }

                modal.classList.add('show-modal');
            });
        });
    }

    const semuaTeksKetikan = document.querySelectorAll('.typing-text');
    semuaTeksKetikan.forEach(el => {
        el.setAttribute('data-teks', el.innerHTML);
        el.innerHTML = '';
    });
});

// Fungsi Menutup Layar & Mematikan Lagu
function tutupModal() {
    const modal = document.getElementById('image-modal');
    const modalIframe = document.getElementById('modal-iframe');

    if (modal) {
        modal.classList.remove('show-modal');
        // KUNCI PENTING: Mengosongkan src agar lagu berhenti berputar saat ditutup
        if (modalIframe) {
            modalIframe.src = "";
        }
    }
}

// ==========================================
// 2. FUNGSI KADO & PEMUTAR MUSIK LATAR
// ==========================================
function bukaKado() {
    buatHujanBunga();

    const flash = document.getElementById('flash-light');
    if (flash) flash.classList.add('flash-active');

    // --- MULAI MUSIK & MUNCULKAN POP-UP ---
    const bgMusic = document.getElementById('bg-music');
    const musicPopup = document.getElementById('music-popup');

    // Putar musiknya
    if (bgMusic) {
        bgMusic.play().catch(error => {
            console.log("Browser memblokir autoplay, tidak masalah.");
        });
    }

    // Munculkan notifikasi pop-up dari bawah layar
    if (musicPopup) {
        setTimeout(() => {
            musicPopup.classList.add('show-music');
        }, 1000);
    }
    // --------------------------------------

    setTimeout(() => {
        const landingPage = document.getElementById('landing-page');
        const mainContent = document.getElementById('main-content');

        if (landingPage) landingPage.style.display = 'none';
        if (mainContent) mainContent.classList.remove('hidden');

        jalankanAnimasiScroll();
    }, 450);
}

function buatHujanBunga() {
    const container = document.getElementById('flower-rain');
    if (!container) return;

    const bungaPilihan = ['🌸', '🌺', '🌷', '✨', '💖'];

    for (let i = 0; i < 40; i++) {
        const petal = document.createElement('div');
        petal.classList.add('petal');

        petal.innerText = bungaPilihan[Math.floor(Math.random() * bungaPilihan.length)];
        petal.style.left = Math.random() * 100 + 'vw';
        petal.style.animationDuration = (Math.random() * 3 + 2) + 's';
        petal.style.animationDelay = (Math.random() * 1) + 's';

        container.appendChild(petal);

        setTimeout(() => {
            petal.remove();
        }, 6000);
    }
}

// ==========================================
// 3. FUNGSI SENSOR SCROLL & MESIN TIK BERURUTAN
// ==========================================
function jalankanAnimasiScroll() {
    const elemenScroll = document.querySelectorAll('.show-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                if (!entry.target.classList.contains('is-visible')) {
                    entry.target.classList.add('is-visible');
                    mulaiKetikanBerurutan(entry.target);
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -35% 0px"
    });

    elemenScroll.forEach((el) => observer.observe(el));
}

async function mulaiKetikanBerurutan(slideTarget) {
    const teksKetikan = slideTarget.querySelectorAll('.typing-text');

    await new Promise(resolve => setTimeout(resolve, 3500));

    for (let i = 0; i < teksKetikan.length; i++) {
        const el = teksKetikan[i];
        const teksAsli = el.getAttribute('data-teks');

        if (teksAsli) {
            await ketikTeks(el, teksAsli);
            await new Promise(resolve => setTimeout(resolve, 400));
        }
    }
}

function ketikTeks(elemen, teks) {
    return new Promise(resolve => {
        let index = 0;
        elemen.innerHTML = '';

        elemen.classList.add('is-typing');

        function ketik() {
            if (index < teks.length) {
                elemen.innerHTML += teks.charAt(index);
                index++;
                setTimeout(ketik, 35);
            } else {
                elemen.classList.remove('is-typing');
                elemen.classList.add('typing-done');
                resolve();
            }
        }

        ketik();
    });
}

// ==========================================
// 4. FUNGSI TOGGLE PLAY/PAUSE MUSIK (SPOTIFY STYLE)
// ==========================================
function toggleMusic() {
    const bgMusic = document.getElementById('bg-music');
    const iconPlay = document.getElementById('icon-play');
    const iconPause = document.getElementById('icon-pause');

    if (!bgMusic) return;

    if (bgMusic.paused) {
        bgMusic.play().catch(console.error);
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
    } else {
        bgMusic.pause();
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
    }
}

// ==========================================
// 5. FUNGSI MENYEMBUNYIKAN POP-UP MUSIK SAAT SCROLL
// ==========================================
function hideMusicPopup() {
    const musicPopup = document.getElementById('music-popup');
    const showMusicBtn = document.getElementById('show-music-btn');
    if (musicPopup) {
        musicPopup.classList.remove('show-music');
    }
    if (showMusicBtn) {
        showMusicBtn.classList.add('show-btn');
    }
}

function showMusicPopup() {
    const musicPopup = document.getElementById('music-popup');
    const showMusicBtn = document.getElementById('show-music-btn');
    if (musicPopup) {
        musicPopup.classList.add('show-music');
    }
    if (showMusicBtn) {
        showMusicBtn.classList.remove('show-btn');
    }
}

// Auto-hide pop-up musik saat user mulai scroll
(function () {
    let sudahDisembunyikan = false;

    window.addEventListener('scroll', function () {
        const musicPopup = document.getElementById('music-popup');

        // Hanya sembunyikan jika pop-up sedang tampil dan belum pernah disembunyikan oleh scroll
        if (!sudahDisembunyikan && musicPopup && musicPopup.classList.contains('show-music')) {
            hideMusicPopup();
            sudahDisembunyikan = true;
        }
    });

    // Reset flag saat pop-up ditampilkan kembali lewat tombol 🎵
    const originalShowMusicPopup = showMusicPopup;
    showMusicPopup = function () {
        sudahDisembunyikan = false;
        originalShowMusicPopup();
    };
    // Pasang ulang ke window agar onclick di HTML tetap berfungsi
    window.showMusicPopup = showMusicPopup;
})();

// ==========================================
// SCRATCH CARD (ERASER EFFECT) + GALLERY UNLOCK LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const canvases = document.querySelectorAll('.scratch-canvas');
    const galleryScroll = document.querySelector('.gallery-scroll');
    const galleryHint = document.getElementById('gallery-hint');
    const gallerySlider = document.getElementById('gallery-slider');
    const gallerySliderThumb = document.getElementById('gallery-slider-thumb');

    const totalCanvases = canvases.length;
    const clearedSet = new Set();
    let galleryUnlocked = false;

    function updateSlider() {
        if (!gallerySliderThumb || !galleryScroll) return;
        const maxScroll = galleryScroll.scrollWidth - galleryScroll.clientWidth;
        if (maxScroll > 0) {
            const scrollPercent = galleryScroll.scrollLeft / maxScroll;
            const trackWidth = gallerySliderThumb.parentElement.clientWidth;
            const thumbWidth = gallerySliderThumb.clientWidth;
            const maxLeft = trackWidth - thumbWidth;
            gallerySliderThumb.style.left = (scrollPercent * maxLeft) + 'px';
        }
    }

    function scrollToCard(cardIndex) {
        if (!galleryScroll) return;
        const cards = galleryScroll.querySelectorAll('.scratch-card');
        if (cardIndex < cards.length) {
            const card = cards[cardIndex];
            // Hitung posisi scroll secara manual agar card berada di tengah container
            // Ini menghindari scrollIntoView yang bisa menggeser seluruh halaman di HP
            const containerWidth = galleryScroll.clientWidth;
            const cardLeft = card.offsetLeft;
            const cardWidth = card.offsetWidth;
            const targetScroll = cardLeft - (containerWidth / 2) + (cardWidth / 2);

            // Sementara aktifkan scroll agar bisa geser
            galleryScroll.style.overflowX = 'auto';
            galleryScroll.scrollTo({ left: targetScroll, behavior: 'smooth' });
            // Kunci lagi setelah scroll selesai
            setTimeout(() => {
                if (!galleryUnlocked) {
                    galleryScroll.style.overflowX = 'hidden';
                }
                updateSlider();
            }, 600);
        }
    }

    // Tampilkan slider dari awal
    if (gallerySlider) {
        gallerySlider.classList.add('slider-visible');
    }

    function checkCanvasCleared(canvas, index) {
        if (clearedSet.has(index)) return;

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let transparentCount = 0;
        let sampledCount = 0;

        for (let i = 3; i < pixels.length; i += 8) {
            sampledCount++;
            if (pixels[i] === 0) transparentCount++;
        }

        const ratio = transparentCount / sampledCount;
        if (ratio > 0.45) {
            clearedSet.add(index);
            // Fade out sisa canvas
            canvas.style.transition = 'opacity 0.5s ease';
            canvas.style.opacity = '0';
            setTimeout(() => {
                canvas.style.pointerEvents = 'none';
            }, 500);

            // Update hint
            if (galleryHint) {
                galleryHint.textContent = '✨ Foto ' + clearedSet.size + ' dari ' + totalCanvases + ' terbuka ✨';
            }

            // Cek apakah semua sudah dibersihkan
            if (clearedSet.size >= totalCanvases) {
                // Semua selesai — unlock untuk geser bebas
                galleryUnlocked = true;
                if (galleryScroll) {
                    galleryScroll.classList.add('gallery-unlocked');
                    galleryScroll.style.overflowX = 'auto';
                    galleryScroll.style.touchAction = 'pan-x pan-y';
                    // Sync slider saat scroll bebas
                    galleryScroll.addEventListener('scroll', updateSlider);
                }
                if (galleryHint) {
                    galleryHint.textContent = 'Semua foto sudah terbuka! Geser kesamping untuk melihatnya';
                    galleryHint.classList.add('hint-unlocked');
                }
            } else {
                // Auto-scroll ke foto berikutnya
                setTimeout(() => {
                    scrollToCard(index + 1);
                }, 700);
            }
        }
    }

    canvases.forEach((canvas, index) => {
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let brushRadius = 25;
        let drawMoveCount = 0;

        setTimeout(() => {
            canvas.width = 220;
            canvas.height = Math.round(220 * 16 / 9);

            ctx.fillStyle = '#FFF8E1';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Glitter emas kecil-kecil
            for (let i = 0; i < 300; i++) {
                ctx.beginPath();
                ctx.arc(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    Math.random() * 1.8 + 0.3,
                    0, Math.PI * 2
                );
                const goldColors = [
                    'rgba(255, 215, 0, 0.9)',
                    'rgba(218, 165, 32, 0.85)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(253, 216, 53, 0.75)',
                    'rgba(255, 235, 59, 0.7)',
                    'rgba(245, 127, 23, 0.6)'
                ];
                ctx.fillStyle = goldColors[Math.floor(Math.random() * goldColors.length)];
                ctx.fill();
            }

            ctx.globalCompositeOperation = 'destination-out';

            const startPosition = (e) => {
                isDrawing = true;
                drawMoveCount = 0;
                draw(e);
            };

            const endPosition = () => {
                isDrawing = false;
                ctx.beginPath();
                // Cek setiap kali selesai menggosok
                checkCanvasCleared(canvas, index);
            };

            const draw = (e) => {
                if (!isDrawing) return;

                let clientX, clientY;
                if (e.type.includes('touch')) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }

                const canvasRect = canvas.getBoundingClientRect();
                const x = clientX - canvasRect.left;
                const y = clientY - canvasRect.top;

                ctx.lineWidth = brushRadius * 2;
                ctx.lineCap = 'round';
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);

                // Juga cek selama menggosok setiap 15 gerakan
                drawMoveCount++;
                if (drawMoveCount % 15 === 0) {
                    checkCanvasCleared(canvas, index);
                }
            };

            canvas.addEventListener('mousedown', startPosition);
            canvas.addEventListener('mouseup', endPosition);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseleave', endPosition);

            canvas.addEventListener('touchstart', startPosition, { passive: true });
            canvas.addEventListener('touchend', endPosition);
            canvas.addEventListener('touchmove', (e) => {
                if (isDrawing) e.preventDefault();
                draw(e);
            }, { passive: false });

        }, 500);
    });
});

// ==========================================
// FITUR KEMBANG API MERIAH 🎆 (Boyfriend Day Celebration)
// ==========================================
let fireworksAnimationId = null;
let fireworksInterval = null;
let fireworksCanvas = null;
let fireworksCtx = null;
let fireworksRockets = [];
let fireworksParticles = [];
let isFireworksRunning = false;

// Palet warna kembang api yang kaya dan cerah
const FIREWORK_PALETTES = [
    // Golden Luxury
    ['#ffe082', '#ffd54f', '#ffca28', '#ffb300', '#ffffff', '#fff8e1'],
    // Romantic Rose
    ['#ff4081', '#f50057', '#ff80ab', '#ffffff', '#ffd700'],
    // Cosmic Cyan & Purple
    ['#00e5ff', '#18ffff', '#7c4dff', '#b388ff', '#ffffff'],
    // Emerald Radiance
    ['#00e676', '#69f0ae', '#b9f6ca', '#ffff8d', '#ffffff'],
    // Rainbow Festive
    ['#ff1744', '#ff9100', '#ffd600', '#00e676', '#00e5ff', '#d500f9', '#ffffff']
];

class FireworkRocket {
    constructor(startX, startY, targetX, targetY, palette, type = 'normal') {
        this.x = startX;
        this.y = startY;
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.distanceToTarget = Math.hypot(targetX - startX, targetY - startY);
        this.distanceTraveled = 0;
        this.coordinates = [];
        this.coordinateCount = 3;
        while (this.coordinateCount--) {
            this.coordinates.push([this.x, this.y]);
        }
        this.angle = Math.atan2(targetY - startY, targetX - startX);
        this.speed = 3.5 + Math.random() * 2.5;
        this.acceleration = 1.04;
        this.palette = palette;
        this.type = type;
        this.hue = Math.floor(Math.random() * 360);
    }

    update(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);

        this.speed *= this.acceleration;
        const vx = Math.cos(this.angle) * this.speed;
        const vy = Math.sin(this.angle) * this.speed;
        this.distanceTraveled = Math.hypot(this.x + vx - this.startX, this.y + vy - this.startY);

        if (this.distanceTraveled >= this.distanceToTarget) {
            createExplosion(this.targetX, this.targetY, this.palette, this.type);
            fireworksRockets.splice(index, 1);
        } else {
            this.x += vx;
            this.y += vy;
        }
    }

    draw() {
        if (!fireworksCtx) return;
        fireworksCtx.beginPath();
        fireworksCtx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        fireworksCtx.lineTo(this.x, this.y);
        fireworksCtx.strokeStyle = 'rgba(255, 224, 130, 0.9)';
        fireworksCtx.lineWidth = 2.5;
        fireworksCtx.stroke();
    }
}

class FireworkParticle {
    constructor(x, y, color, vx, vy, size = 2.5, decay = 0.015) {
        this.x = x;
        this.y = y;
        this.coordinates = [];
        this.coordinateCount = 4;
        while (this.coordinateCount--) {
            this.coordinates.push([this.x, this.y]);
        }
        this.vx = vx;
        this.vy = vy;
        this.friction = 0.95;
        this.gravity = 0.7;
        this.color = color;
        this.alpha = 1;
        this.decay = decay;
        this.size = size;
        this.flicker = Math.random() > 0.5;
    }

    update(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity * 0.08;

        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;

        if (this.alpha <= this.decay) {
            fireworksParticles.splice(index, 1);
        }
    }

    draw() {
        if (!fireworksCtx) return;
        fireworksCtx.save();
        const displayAlpha = this.flicker && Math.random() < 0.2 ? Math.max(0, this.alpha * 0.4) : Math.max(0, this.alpha);
        fireworksCtx.globalAlpha = displayAlpha;
        fireworksCtx.beginPath();
        fireworksCtx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        fireworksCtx.lineTo(this.x, this.y);
        fireworksCtx.strokeStyle = this.color;
        fireworksCtx.lineWidth = this.size;
        fireworksCtx.stroke();
        fireworksCtx.restore();
    }
}

function createExplosion(x, y, palette, type = 'normal') {
    if (type === 'heart') {
        const heartCount = 65;
        for (let i = 0; i < heartCount; i++) {
            const t = (Math.PI * 2 * i) / heartCount;
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            const speed = 0.32 + Math.random() * 0.05;
            const color = palette[Math.floor(Math.random() * palette.length)];
            fireworksParticles.push(new FireworkParticle(x, y, color, hx * speed, hy * speed, 2.8, 0.012));
        }
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 2;
            fireworksParticles.push(new FireworkParticle(x, y, '#ffffff', Math.cos(angle) * spd, Math.sin(angle) * spd, 2, 0.02));
        }
    } else if (type === 'ring') {
        const ringCount = 50;
        const baseSpeed = 4.5 + Math.random() * 2;
        for (let i = 0; i < ringCount; i++) {
            const angle = (Math.PI * 2 * i) / ringCount;
            const color = palette[i % palette.length];
            fireworksParticles.push(new FireworkParticle(x, y, color, Math.cos(angle) * baseSpeed, Math.sin(angle) * baseSpeed, 2.5, 0.014));
        }
    } else {
        const isWillow = Math.random() < 0.3;
        const count = 70 + Math.floor(Math.random() * 40);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.cos(Math.random() * Math.PI / 2) * (isWillow ? 5 : 7.5);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = palette[Math.floor(Math.random() * palette.length)];
            const decay = isWillow ? (0.007 + Math.random() * 0.007) : (0.012 + Math.random() * 0.016);
            const p = new FireworkParticle(x, y, color, vx, vy, isWillow ? 2 : 2.5, decay);
            if (isWillow) {
                p.gravity = 1.2;
                p.friction = 0.94;
            }
            fireworksParticles.push(p);
        }
    }
}

function launchFireworkRocket(targetX = null, targetY = null, type = 'normal') {
    if (!fireworksCanvas) return;
    const startX = fireworksCanvas.width * 0.15 + Math.random() * (fireworksCanvas.width * 0.7);
    const startY = fireworksCanvas.height;
    const tx = targetX !== null ? targetX : (fireworksCanvas.width * 0.1 + Math.random() * (fireworksCanvas.width * 0.8));
    const ty = targetY !== null ? targetY : (fireworksCanvas.height * 0.12 + Math.random() * (fireworksCanvas.height * 0.45));
    const palette = FIREWORK_PALETTES[Math.floor(Math.random() * FIREWORK_PALETTES.length)];
    fireworksRockets.push(new FireworkRocket(startX, startY, tx, ty, palette, type));
}

function loopFireworks() {
    if (!isFireworksRunning || !fireworksCanvas || !fireworksCtx) return;
    fireworksAnimationId = requestAnimationFrame(loopFireworks);

    // Trail halus menghitam
    fireworksCtx.globalCompositeOperation = 'destination-out';
    fireworksCtx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    fireworksCtx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    fireworksCtx.globalCompositeOperation = 'lighter';

    // Render roket
    for (let i = fireworksRockets.length - 1; i >= 0; i--) {
        fireworksRockets[i].draw();
        fireworksRockets[i].update(i);
    }

    // Render partikel
    for (let i = fireworksParticles.length - 1; i >= 0; i--) {
        fireworksParticles[i].draw();
        fireworksParticles[i].update(i);
    }
}

function resizeFireworksCanvas() {
    if (!fireworksCanvas) return;
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
}

function onFireworksPageClick(e) {
    // Abaikan jika klik tombol kembali atau tombol aksi
    if (e.target.closest('#btn-back-fireworks') || e.target.closest('#btn-launch-mega')) {
        return;
    }
    const rect = fireworksCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const types = ['normal', 'heart', 'ring'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    launchFireworkRocket(x, y, chosenType);
}

function bukaHalamanKembangApi() {
    const page = document.getElementById('fireworks-page');
    fireworksCanvas = document.getElementById('fireworks-canvas');
    if (!page || !fireworksCanvas) return;

    fireworksCtx = fireworksCanvas.getContext('2d');
    resizeFireworksCanvas();
    window.addEventListener('resize', resizeFireworksCanvas);

    // Tampilkan overlay
    page.classList.add('active');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            page.classList.add('visible');
        });
    });

    isFireworksRunning = true;
    fireworksRockets = [];
    fireworksParticles = [];

    // Mulai loop animasi
    loopFireworks();

    // Luncurkan tembakan pembuka meriah
    setTimeout(() => {
        launchFireworkRocket(fireworksCanvas.width * 0.25, fireworksCanvas.height * 0.25, 'heart');
        launchFireworkRocket(fireworksCanvas.width * 0.75, fireworksCanvas.height * 0.28, 'normal');
    }, 200);

    setTimeout(() => {
        launchFireworkRocket(fireworksCanvas.width * 0.5, fireworksCanvas.height * 0.18, 'ring');
    }, 600);

    setTimeout(() => {
        launchFireworkRocket(fireworksCanvas.width * 0.35, fireworksCanvas.height * 0.3, 'normal');
        launchFireworkRocket(fireworksCanvas.width * 0.65, fireworksCanvas.height * 0.22, 'heart');
        buatConfetti();
    }, 1000);

    // Peluncur otomatis berkala
    let counter = 0;
    if (fireworksInterval) clearInterval(fireworksInterval);
    fireworksInterval = setInterval(() => {
        if (!isFireworksRunning) return;
        counter++;
        const type = (counter % 3 === 0) ? 'heart' : (counter % 5 === 0 ? 'ring' : 'normal');
        launchFireworkRocket(null, null, type);

        // Terkadang tembakkan roket ganda
        if (Math.random() < 0.4) {
            setTimeout(() => {
                if (isFireworksRunning) launchFireworkRocket(null, null, 'normal');
            }, 300);
        }
    }, 1100);

    // Pasang listener klik di layar
    page.removeEventListener('click', onFireworksPageClick);
    page.addEventListener('click', onFireworksPageClick);
}

function tutupHalamanKembangApi() {
    const page = document.getElementById('fireworks-page');
    if (!page) return;

    isFireworksRunning = false;
    if (fireworksAnimationId) {
        cancelAnimationFrame(fireworksAnimationId);
        fireworksAnimationId = null;
    }
    if (fireworksInterval) {
        clearInterval(fireworksInterval);
        fireworksInterval = null;
    }

    window.removeEventListener('resize', resizeFireworksCanvas);
    page.removeEventListener('click', onFireworksPageClick);

    page.classList.remove('visible');
    setTimeout(() => {
        page.classList.remove('active');
        fireworksRockets = [];
        fireworksParticles = [];
        if (fireworksCtx && fireworksCanvas) {
            fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
        }
    }, 800);
}

function luncurkanMegaKembangApi(e) {
    if (e) e.stopPropagation();
    if (!fireworksCanvas) return;

    buatConfetti();

    // Luncurkan tembakan salvo spektakuler
    const positions = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
    positions.forEach((pos, idx) => {
        setTimeout(() => {
            if (!isFireworksRunning) return;
            const targetX = fireworksCanvas.width * pos;
            const targetY = fireworksCanvas.height * (0.15 + (idx % 3) * 0.1);
            const type = (idx === 2 || idx === 3) ? 'heart' : ((idx === 1 || idx === 4) ? 'ring' : 'normal');
            launchFireworkRocket(targetX, targetY, type);
        }, idx * 160);
    });
}

function buatConfetti() {
    const colors = [
        '#ff6b81', '#ffb6c1', '#a55eea', '#6c5ce7', '#ffd700',
        '#ff9ff3', '#f368e0', '#ffffff', '#00d2d3', '#ff6348',
        '#7bed9f', '#ffa502', '#ff4757', '#2ed573', '#eccc68',
        '#ff7eb3', '#c56cf0', '#17c0eb', '#ffc312'
    ];
    const shapes = ['circle', 'rect', 'star', 'heart', 'ribbon'];
    const animStyles = ['', 'confetti-swirl', 'confetti-zigzag'];

    function burstWave(count, delayBase) {
        for (let i = 0; i < count; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti-piece');

            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const animStyle = animStyles[Math.floor(Math.random() * animStyles.length)];
            const size = 5 + Math.random() * 10;

            if (animStyle) confetti.classList.add(animStyle);

            if (shape === 'star') {
                confetti.classList.add('confetti-star');
                confetti.textContent = '⭐';
                confetti.style.fontSize = (10 + Math.random() * 8) + 'px';
            } else if (shape === 'heart') {
                confetti.classList.add('confetti-heart');
                confetti.textContent = '💖';
                confetti.style.fontSize = (8 + Math.random() * 8) + 'px';
            } else if (shape === 'ribbon') {
                confetti.classList.add('confetti-ribbon');
                confetti.style.width = (3 + Math.random() * 4) + 'px';
                confetti.style.height = (14 + Math.random() * 12) + 'px';
                confetti.style.background = color;
                confetti.style.borderRadius = '1px';
            } else if (shape === 'rect') {
                confetti.style.width = size + 'px';
                confetti.style.height = (size * 0.5) + 'px';
                confetti.style.background = color;
                confetti.style.borderRadius = '2px';
            } else {
                confetti.style.width = size + 'px';
                confetti.style.height = size + 'px';
                confetti.style.background = color;
                confetti.style.borderRadius = '50%';
            }

            // Wider spread across the entire screen
            confetti.style.left = (5 + Math.random() * 90) + 'vw';
            confetti.style.top = '-15px';
            confetti.style.animationDuration = (2.5 + Math.random() * 3) + 's';
            confetti.style.animationDelay = (delayBase + Math.random() * 1.2) + 's';

            document.body.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, 8000 + delayBase * 1000);
        }
    }

    // Gelombang 1: Ledakan utama
    burstWave(60, 0);

    // Gelombang 2: Ledakan kedua setelah 0.8 detik
    setTimeout(() => burstWave(50, 0), 800);

    // Gelombang 3: Hujan confetti lanjutan
    setTimeout(() => burstWave(40, 0), 2000);
}