"""Обложки, иконки и тексты витрин Яндекс Игр и CrazyGames."""
from __future__ import annotations

import json
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

try:
    import numpy as np
except ImportError:
    np = None

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ASSETS = os.path.join(ROOT, 'public', 'assets', 'pirate')
OUT = os.path.join(ROOT, 'store')
FONT = r'C:\Windows\Fonts\georgiab.ttf'
FONT_REG = r'C:\Windows\Fonts\georgia.ttf'

CREAM = (255, 246, 228, 255)
INK = (42, 24, 8, 255)


def dekey(im: Image.Image) -> Image.Image:
    im = im.convert('RGBA')
    if np is None:
        return im
    arr = np.asarray(im).astype(np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    dist = np.abs(r - 255) + np.abs(g) + np.abs(b - 255)
    alpha = arr[:, :, 3].copy()
    alpha[dist < 90] = 0
    fade = (dist >= 90) & (dist < 180)
    alpha[fade] = (alpha[fade] * (dist[fade] - 90) / 90).astype(np.int16)
    arr[:, :, 3] = np.clip(alpha, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


def load_ship(name: str) -> Image.Image:
    return dekey(Image.open(os.path.join(ASSETS, name)))


def sea_canvas(size: tuple[int, int], horizon_ratio: float = 0.46) -> tuple[Image.Image, int]:
    sea = Image.open(os.path.join(ASSETS, 'sea.jpg')).convert('RGB')
    tw, th = size
    scale = max(tw / sea.width, th / sea.height)
    sea = sea.resize((int(sea.width * scale) + 1, int(sea.height * scale) + 1), Image.Resampling.LANCZOS)
    horizon = int(round(300 * scale))
    top = int(horizon - th * horizon_ratio)
    top = max(0, min(top, sea.height - th))
    left = max(0, (sea.width - tw) // 2)
    crop = sea.crop((left, top, left + tw, top + th)).convert('RGBA')
    return crop, int(horizon - top)


def fit_ship(ship: Image.Image, height: int) -> Image.Image:
    ratio = height / ship.height
    return ship.resize((max(1, int(ship.width * ratio)), height), Image.Resampling.LANCZOS)


def paste_ship(base: Image.Image, ship: Image.Image, cx: int, waterline: int, height: int, sink: float = 0.78) -> None:
    sprite = fit_ship(ship, height)
    x = int(cx - sprite.width / 2)
    y = int(waterline - sprite.height * sink)
    shadow = Image.new('RGBA', base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    ell_w = int(sprite.width * 0.72)
    ell_h = max(12, int(sprite.height * 0.08))
    draw.ellipse(
        (cx - ell_w // 2, waterline - ell_h // 2, cx + ell_w // 2, waterline + ell_h // 2),
        fill=(20, 40, 50, 90),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    base.alpha_composite(shadow)
    base.alpha_composite(sprite, (x, y))


def draw_title(base: Image.Image, text: str, xy: tuple[int, int], size: int, anchor: str = 'mm') -> None:
    font = ImageFont.truetype(FONT, size)
    draw = ImageDraw.Draw(base)
    draw.text(xy, text, font=font, fill=CREAM, stroke_width=max(2, size // 14), stroke_fill=INK, anchor=anchor)


def save_rgb(im: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.convert('RGB').save(path, 'PNG', optimize=True)


def compose(size, title, horizon_ratio, ships, title_xy, title_size, title_anchor='mm') -> Image.Image:
    base, waterline = sea_canvas(size, horizon_ratio)
    brig = load_ship('ship-brig.png')
    war = load_ship('ship-war.png')
    cargo = load_ship('ship-cargo.png')
    bank = {'brig': brig, 'war': war, 'cargo': cargo}
    for spec in ships:
        paste_ship(
            base,
            bank[spec['id']],
            spec['x'],
            waterline + spec.get('dy', 0),
            spec['h'],
            spec.get('sink', 0.78),
        )
    if title:
        draw_title(base, title, title_xy, title_size, title_anchor)
    return base


def build_images() -> None:
    titles = {'ru': 'Кильватер', 'en': 'Keelwater', 'es': 'Keelwater'}
    for lang, title in titles.items():
        yandex = os.path.join(OUT, 'yandex', lang)
        crazy = os.path.join(OUT, 'crazygames', lang)

        icon = compose(
            (512, 512),
            title,
            0.42,
            [{'id': 'brig', 'x': 256, 'h': 300, 'dy': 18}],
            (256, 430),
            52,
        )
        save_rgb(icon, os.path.join(yandex, 'icon-512.png'))

        mask = compose(
            (512, 512),
            title,
            0.46,
            [{'id': 'brig', 'x': 256, 'h': 210, 'dy': 6}],
            (256, 400),
            40,
        )
        save_rgb(mask, os.path.join(yandex, 'icon-maskable-512.png'))

        cover = compose(
            (800, 470),
            title,
            0.42,
            [
                {'id': 'cargo', 'x': 300, 'h': 140, 'dy': -4},
                {'id': 'brig', 'x': 590, 'h': 240, 'dy': 14},
            ],
            (175, 118),
            52,
        )
        save_rgb(cover, os.path.join(yandex, 'cover-800x470.png'))

        hero = compose(
            (1560, 520),
            title,
            0.48,
            [
                {'id': 'cargo', 'x': 430, 'h': 170, 'dy': -6},
                {'id': 'war', 'x': 980, 'h': 230, 'dy': 4},
                {'id': 'brig', 'x': 1280, 'h': 280, 'dy': 18},
            ],
            (280, 150),
            72,
        )
        save_rgb(hero, os.path.join(yandex, 'hero-1560x520.png'))

        land = compose(
            (1920, 1080),
            title,
            0.42,
            [
                {'id': 'cargo', 'x': 760, 'h': 250, 'dy': -18},
                {'id': 'war', 'x': 1140, 'h': 390, 'dy': 4},
                {'id': 'brig', 'x': 1580, 'h': 500, 'dy': 26},
            ],
            (360, 230),
            100,
        )
        save_rgb(land, os.path.join(crazy, 'cover-landscape-1920x1080.png'))

        portrait = compose(
            (800, 1200),
            title,
            0.50,
            [
                {'id': 'cargo', 'x': 220, 'h': 240, 'dy': -24},
                {'id': 'brig', 'x': 450, 'h': 520, 'dy': 30},
            ],
            (400, 130),
            64,
        )
        save_rgb(portrait, os.path.join(crazy, 'cover-portrait-800x1200.png'))

        square = compose(
            (800, 800),
            title,
            0.40,
            [
                {'id': 'war', 'x': 250, 'h': 250, 'dy': 0},
                {'id': 'brig', 'x': 500, 'h': 380, 'dy': 20},
            ],
            (400, 640),
            64,
        )
        save_rgb(square, os.path.join(crazy, 'cover-square-800x800.png'))
        print('art', lang)


TEXTS = {
    'ru': {
        'title': 'Кильватер',
        'seo': 'Топите вражеские корабли с перископа, пока они не открыли ответный огонь. С каждой минутой море становится злее.',
        'short': 'Топите корабли, пока море не ответило залпом.',
        'description': (
            'С перископа вы берёте на прицел суда у горизонта и пускаете торпеду. '
            'Торговцы идут спокойно, военные отвечают огнём, а с каждой минутой кораблей становится больше. '
            'Сундук на парашюте может вернуть жизнь, удвоить счёт или принести якоря. '
            'Якоря открывают следующий бой и редкую оптику. '
            'Море можно сменить: стальной перископ или пиратская бухта. '
            'Партия не обрывается по таймеру — держитесь, пока есть жизни.'
        ),
        'howToPlay': (
            'Наведите прицел мышью или стрелками и стреляйте щелчком или пробелом. '
            'Пока своя торпеда летит, вторую выпустить нельзя. '
            'Попадание даёт очки, каждый выстрел снимает 20. '
            'Военный корабль стреляет в ответ и забирает жизнь. '
            'Сундук нужно сбить после приводнения, иначе его может съесть акула. '
            'Вход в бой стоит якоря. Их приносят удачные партии.'
        ),
        'keywords': 'корабли, торпеда, перископ, аркада, море, стрелялка, якоря',
        'controls': 'Мышь или стрелки — прицел. Щелчок или пробел — выстрел.',
    },
    'en': {
        'title': 'Keelwater',
        'seo': 'Sink enemy ships from a periscope before they fire back. The sea gets meaner with every minute.',
        'short': 'Sink ships before the sea fires back.',
        'description': (
            'Line up ships on the horizon and send a torpedo. Traders sail quietly, warships shoot back, '
            'and every minute the traffic gets thicker. A parachute crate can restore a life, double the score, '
            'or drop anchors. Anchors pay for the next battle and rarer optics. '
            'Switch the sea between a steel periscope and a pirate cove. '
            'A run does not end on a clock. Last as long as your lives hold.'
        ),
        'howToPlay': (
            'Aim with the mouse or the arrow keys. Fire with a click or the space bar. '
            'You cannot launch a second torpedo while yours is still in the water. '
            'Hits score points, and every shot costs 20. A warship fires back and takes a life. '
            'Shoot the crate after it lands, or a shark may eat it. '
            'Starting a battle spends anchors. Strong runs pay them back.'
        ),
        'keywords': 'ships, torpedo, periscope, arcade, sea, shooter, anchors',
        'controls': 'Mouse or arrows to aim. Click or space to fire.',
    },
    'es': {
        'title': 'Keelwater',
        'seo': 'Hunde barcos enemigos desde el periscopio antes de que devuelvan el fuego. El mar se endurece cada minuto.',
        'short': 'Hunde barcos antes de que el mar responda.',
        'description': (
            'Apunta a los barcos del horizonte y lanza un torpedo. Los mercantes navegan tranquilos, '
            'los de guerra responden, y cada minuto el tráfico se vuelve más denso. '
            'Un cofre en paracaídas puede devolver una vida, duplicar los puntos o traer anclas. '
            'Las anclas pagan la siguiente batalla y una óptica más rara. '
            'El mar puede ser un periscopio de acero o una cala pirata. '
            'La partida no se corta por reloj: aguanta mientras te queden vidas.'
        ),
        'howToPlay': (
            'Apunta con el ratón o las flechas. Dispara con un clic o la barra espaciadora. '
            'No sale un segundo torpedo mientras el tuyo sigue en el agua. '
            'Los impactos dan puntos y cada disparo resta 20. Un barco de guerra responde y quita una vida. '
            'Derriba el cofre después de que caiga al agua, o puede comérselo un tiburón. '
            'Entrar en batalla gasta anclas. Las partidas buenas las devuelven.'
        ),
        'keywords': 'barcos, torpedo, periscopio, arcade, mar, disparos, anclas',
        'controls': 'Ratón o flechas para apuntar. Clic o espacio para disparar.',
    },
}


def check_texts() -> None:
    limits = {
        'title': (1, 50),
        'seo': (50, 160),
        'short': (1, 70),
        'description': (100, 1000),
        'howToPlay': (100, 1000),
        'keywords': (1, 100),
    }
    os.makedirs(os.path.join(OUT, 'texts'), exist_ok=True)
    for lang, pack in TEXTS.items():
        for key, (lo, hi) in limits.items():
            n = len(pack[key])
            if not (lo <= n <= hi):
                raise SystemExit(f'{lang} {key} length {n} outside {lo}-{hi}')
            title = pack['title'].lower()
            if key in ('seo', 'short') and title in pack[key].lower():
                raise SystemExit(f'{lang} {key} repeats the title')
        lines = [
            f"Название: {pack['title']}",
            '',
            f"SEO ({len(pack['seo'])}):",
            pack['seo'],
            '',
            f"Коротко ({len(pack['short'])}):",
            pack['short'],
            '',
            f"Описание ({len(pack['description'])}):",
            pack['description'],
            '',
            f"Как играть ({len(pack['howToPlay'])}):",
            pack['howToPlay'],
            '',
            f"Ключевые слова ({len(pack['keywords'])}):",
            pack['keywords'],
            '',
            f"Управление: {pack['controls']}",
        ]
        path = os.path.join(OUT, 'texts', f'{lang}.txt')
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(lines) + '\n')
        print('text', lang, {k: len(pack[k]) for k in limits})
    with open(os.path.join(OUT, 'texts', 'listing.json'), 'w', encoding='utf-8') as fh:
        json.dump(TEXTS, fh, ensure_ascii=False, indent=2)


NOTES = """Материалы витрин «Кильватер» / Keelwater
Яндекс Игры и CrazyGames. Языки игры: русский, английский, испанский.

Общее для обеих площадок
- Ориентация: альбомная.
- Площадки сборки: компьютер. На Билайне и МегаФоне отдельное сенсорное управление, в эти сборки оно не входит.
- Возраст: 12+. Стрельба по кораблям, без крови.
- Категории, которые подходят: аркада и стрелялка. Не больше двух.
- Облачные сохранения не используются.
- Название в материалах совпадает с названием сборки: Кильватер / Keelwater.
- Иконки и обложки собраны из кораблей и моря игры, это не кадр экрана.
- Скрины — живой кадр боя, 1920×1080, 16:9. Четыре на каждый язык.
- Ролики без звука.

Яндекс Игры
- Иконка 512×512 PNG: yandex/<язык>/icon-512.png
- Maskable-иконка 512×512, важное внутри центрального круга: icon-maskable-512.png
- Обложка 800×470 PNG: cover-800x470.png
- Hero 1560×520 PNG: hero-1560x520.png
- Скрины, не меньше двух, лучше все четыре: screenshots/<язык>/
  01-fleet, 02-torpedo, 03-fight, 04-pirate
- Ролик горизонтальный 1920×1080, до 28 с: video/<язык>-horizontal.mp4
- Ролик вертикальный 1080×1920: video/<язык>-vertical.mp4
  Весь альбомный бой по центру, сверху и снизу размытый тот же кадр, без чёрных полей и без обрезки кораблей.
- Тексты с лимитами консоли: texts/<язык>.txt
- Ключевые слова только строчными, через запятую, до 100 символов.
- В SEO и коротком описании нет названия игры и нет слова «бесплатно».

CrazyGames
- Обложка 16:9, 1920×1080: crazygames/<язык>/cover-landscape-1920x1080.png
- Обложка 2:3, 800×1200: cover-portrait-800x1200.png
- Обложка 1:1, 800×800: cover-square-800x800.png
- На обложке только название, без Play, New и логотипов магазинов.
- Превью 16:9, 1920×1080, 15–20 с, без звука, первый кадр — обложка: video/<язык>-landscape.mp4
- Превью 2:3, 1080×1620, те же правила: video/<язык>-portrait.mp4
  Первый кадр — портретная обложка, дальше весь бой по центру на размытом кадре, без чёрных полей.
- Описание и управление на английском обязательны для модерации. Русский и испанский лежат рядом.
- Скрины те же, что для Яндекса: screenshots/<язык>/
"""


if __name__ == '__main__':
    check_texts()
    build_images()
    with open(os.path.join(OUT, 'texts', 'notes.txt'), 'w', encoding='utf-8') as fh:
        fh.write(NOTES)
    print('done')
