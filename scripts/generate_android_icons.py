import os
from PIL import Image, ImageDraw

def render_juro_sprite():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Shadow
    draw.rectangle([6, 26, 6 + 22 - 1, 26 + 4 - 1], fill="#171717")
    draw.rectangle([8, 24, 8 + 20 - 1, 24 + 2 - 1], fill="#171717")

    # Outline
    draw.rectangle([8, 4, 8 + 16 - 1, 4 + 2 - 1], fill="#171717")
    draw.rectangle([6, 6, 6 + 20 - 1, 6 + 2 - 1], fill="#171717")
    draw.rectangle([4, 8, 4 + 24 - 1, 8 + 18 - 1], fill="#171717")
    draw.rectangle([6, 26, 6 + 20 - 1, 26 + 2 - 1], fill="#171717")

    # Body
    draw.rectangle([6, 8, 6 + 20 - 1, 8 + 18 - 1], fill="#F97316")
    draw.rectangle([8, 6, 8 + 16 - 1, 6 + 2 - 1], fill="#F97316")

    # Highlight
    draw.rectangle([8, 8, 8 + 6 - 1, 8 + 4 - 1], fill="#FED7AA")
    draw.rectangle([8, 12, 8 + 2 - 1, 12 + 4 - 1], fill="#FED7AA")
    draw.rectangle([14, 8, 14 + 4 - 1, 8 + 2 - 1], fill="#FFEDD5")

    # Left eye
    draw.rectangle([9, 14, 9 + 3 - 1, 14 + 4 - 1], fill="#171717")
    draw.rectangle([9, 14, 9 + 1 - 1, 14 + 2 - 1], fill="#FFFFFF")

    # Right eye
    draw.rectangle([20, 14, 20 + 3 - 1, 14 + 4 - 1], fill="#171717")
    draw.rectangle([20, 14, 20 + 1 - 1, 14 + 2 - 1], fill="#FFFFFF")

    # Blush
    draw.rectangle([7, 19, 7 + 3 - 1, 19 + 2 - 1], fill=(234, 88, 12, 204))
    draw.rectangle([22, 19, 22 + 3 - 1, 19 + 2 - 1], fill=(234, 88, 12, 204))

    # Mouth
    draw.rectangle([15, 18, 15 + 2 - 1, 18 + 1 - 1], fill="#171717")

    return im

def create_adaptive_foreground(juro_sprite, size):
    # Canvas size x size (e.g. 108, 162, 216, 324, 432)
    # Safe zone is inner 66% (center 72/108)
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Target sprite size: around 54% of canvas so it's comfortably inside safe zone
    sprite_size = int(size * 0.54)
    # Keep pixel art scaling crisp
    scaled = juro_sprite.resize((sprite_size, sprite_size), Image.Resampling.NEAREST)
    offset_x = (size - sprite_size) // 2
    offset_y = (size - sprite_size) // 2
    fg.paste(scaled, (offset_x, offset_y), scaled)
    return fg

def create_legacy_icon(juro_sprite, size, round_icon=False):
    # Canvas with background color #FFF8F0
    bg_color = (255, 248, 240, 255)
    border_color = (23, 23, 23, 255)
    
    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    
    radius = size // 2 if round_icon else int(size * 0.22)
    
    # Draw rounded or circular background
    if round_icon:
        draw.ellipse([0, 0, size - 1, size - 1], fill=bg_color, outline=border_color, width=max(1, size // 36))
    else:
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=bg_color, outline=border_color, width=max(1, size // 36))
        
    # Scale Juro sprite to fit ~68% of the icon
    sprite_size = int(size * 0.68)
    scaled = juro_sprite.resize((sprite_size, sprite_size), Image.Resampling.NEAREST)
    offset_x = (size - sprite_size) // 2
    offset_y = (size - sprite_size) // 2
    icon.paste(scaled, (offset_x, offset_y), scaled)
    return icon

def create_splash_screen(juro_sprite, width, height):
    # Warm cream background
    bg = Image.new("RGBA", (width, height), (250, 247, 242, 255))
    
    # Size Juro nicely in the center
    min_dim = min(width, height)
    sprite_size = int(min_dim * 0.35)
    # Ensure sprite size is a multiple of 32 for crispness
    sprite_size = max(64, (sprite_size // 32) * 32)
    
    scaled = juro_sprite.resize((sprite_size, sprite_size), Image.Resampling.NEAREST)
    offset_x = (width - sprite_size) // 2
    offset_y = (height - sprite_size) // 2
    bg.paste(scaled, (offset_x, offset_y), scaled)
    return bg

def main():
    juro = render_juro_sprite()
    res_dir = os.path.join("android", "app", "src", "main", "res")
    
    densities = {
        "mdpi": {"icon": 48, "fg": 108},
        "hdpi": {"icon": 72, "fg": 162},
        "xhdpi": {"icon": 96, "fg": 216},
        "xxhdpi": {"icon": 144, "fg": 324},
        "xxxhdpi": {"icon": 192, "fg": 432},
    }
    
    # 1. Update mipmap icons
    for dens, sizes in densities.items():
        folder = os.path.join(res_dir, f"mipmap-{dens}")
        os.makedirs(folder, exist_ok=True)
        
        # ic_launcher.png
        icon = create_legacy_icon(juro, sizes["icon"], round_icon=False)
        icon.save(os.path.join(folder, "ic_launcher.png"), "PNG")
        
        # ic_launcher_round.png
        icon_round = create_legacy_icon(juro, sizes["icon"], round_icon=True)
        icon_round.save(os.path.join(folder, "ic_launcher_round.png"), "PNG")
        
        # ic_launcher_foreground.png
        fg = create_adaptive_foreground(juro, sizes["fg"])
        fg.save(os.path.join(folder, "ic_launcher_foreground.png"), "PNG")
        print(f"Generated icons for mipmap-{dens}")
        
    # 2. Update splash screens
    splashes = [
        ("drawable", 480, 320),
        ("drawable-land-mdpi", 480, 320),
        ("drawable-land-hdpi", 800, 480),
        ("drawable-land-xhdpi", 1280, 720),
        ("drawable-land-xxhdpi", 1600, 960),
        ("drawable-land-xxxhdpi", 1920, 1280),
        ("drawable-port-mdpi", 320, 480),
        ("drawable-port-hdpi", 480, 800),
        ("drawable-port-xhdpi", 720, 1280),
        ("drawable-port-xxhdpi", 960, 1600),
        ("drawable-port-xxxhdpi", 1280, 1920),
    ]
    
    for folder_name, w, h in splashes:
        target_dir = os.path.join(res_dir, folder_name)
        os.makedirs(target_dir, exist_ok=True)
        splash_img = create_splash_screen(juro, w, h)
        splash_img.save(os.path.join(target_dir, "splash.png"), "PNG")
        print(f"Generated splash for {folder_name} ({w}x{h})")

if __name__ == "__main__":
    main()
