from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_WIDTH = 4096
MAX_IMAGE_HEIGHT = 4096
ALLOWED_IMAGE_TYPES = {"png", "jpeg", "webp", "gif"}
IMAGE_TYPE_EXTENSIONS = {
    "png": ".png",
    "jpeg": ".jpg",
    "webp": ".webp",
    "gif": ".gif",
}
IMAGE_SAVE_FORMATS = {
    "png": "PNG",
    "jpeg": "JPEG",
    "webp": "WEBP",
    "gif": "GIF",
}


def process_uploaded_image(photo):
    try:
        photo.stream.seek(0)
        raw = photo.stream.read()
        photo.stream.seek(0)
        with Image.open(BytesIO(raw)) as image:
            detected_type = (image.format or "").lower()
            if detected_type not in ALLOWED_IMAGE_TYPES:
                raise ValueError("Uploaded file must be a valid image")

            frame_count = getattr(image, "n_frames", 1)
            if frame_count > 1:
                raise ValueError("Animated images are not allowed")

            image = ImageOps.exif_transpose(image)
            image.load()

            width, height = image.size
            if width > MAX_IMAGE_WIDTH or height > MAX_IMAGE_HEIGHT:
                raise ValueError(
                    f"Image dimensions exceed {MAX_IMAGE_WIDTH}x{MAX_IMAGE_HEIGHT}"
                )

            output = BytesIO()
            save_format = IMAGE_SAVE_FORMATS[detected_type]

            if detected_type == "jpeg":
                if image.mode not in ("RGB", "L"):
                    image = image.convert("RGB")
                image.save(output, format=save_format, quality=88, optimize=True)
            elif detected_type == "png":
                if image.mode not in ("RGB", "RGBA", "L", "LA"):
                    image = image.convert("RGBA")
                image.save(output, format=save_format, optimize=True)
            elif detected_type == "webp":
                if image.mode not in ("RGB", "RGBA"):
                    image = image.convert("RGBA")
                image.save(output, format=save_format, quality=86, method=6)
            else:
                image.save(output, format=save_format)

            return detected_type, output.getvalue()
    except UnidentifiedImageError as exc:
        raise ValueError("Uploaded file must be a valid image") from exc
