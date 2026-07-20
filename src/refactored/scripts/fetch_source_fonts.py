# -*- coding: utf-8 -*-
# !/usr/bin/env python
"""Download the source fonts the han_serif build needs.

The hanzi come from Source Han Serif CN (TrueType conversions by Pal3love) and
the pinyin from M+ 1m. Neither is redistributed in this repository, so this
script fetches them into res/fonts/han-serif/.

    python -m refactored.scripts.fetch_source_fonts                # all weights
    python -m refactored.scripts.fetch_source_fonts -w regular bold

Both sources are OFL/free licensed; see the LICENSE files inside the archives.
"""

from __future__ import annotations

import argparse
import io
import os
import shutil
import tarfile
import tempfile
import urllib.request
import zipfile
from typing import List, Optional, Set

from ..config.font_config import FontConfig, FontType, FontWeight
from ..config.paths import HAN_SERIF_FONT_DIR
from ..utils.logging_config import get_logger, setup_logging

# Source Han Serif CN, TrueType conversion. Serif 2.003.
SOURCE_HAN_RELEASE = "2.005-2.003-1.002-R"
SOURCE_HAN_URL = (
    "https://github.com/Pal3love/Source-Han-TrueType/releases/download/"
    f"{SOURCE_HAN_RELEASE}/SourceHanSerifCN.zip"
)

# M+ TESTFLIGHT 063, via the Debian mirror. The upstream osdn.net download host
# has been unreachable; mplus-fonts.osdn.jp only serves the project pages now.
MPLUS_URL = (
    "https://deb.debian.org/debian/pool/main/f/fonts-mplus/"
    "fonts-mplus_063.orig.tar.xz"
)

DOWNLOAD_TIMEOUT_SECONDS = 600


def _download(url: str, description: str) -> bytes:
    """Fetch a URL into memory, reporting size."""
    logger = get_logger("mengshen.scripts.fetch_fonts")
    logger.info("Downloading %s ...", description)
    with urllib.request.urlopen(  # nosec B310 - fixed https URLs above
        url, timeout=DOWNLOAD_TIMEOUT_SECONDS
    ) as response:
        payload: bytes = response.read()
    logger.info("  %.1f MB", len(payload) / 1024 / 1024)
    return payload


def fetch_source_han(weights: List[FontWeight], dest_dir: str) -> Set[str]:
    """Extract the requested Source Han Serif CN weights."""
    logger = get_logger("mengshen.scripts.fetch_fonts")
    wanted = {f"SourceHanSerifCN-{w.value.source_han_suffix}.ttf": w for w in weights}
    written: Set[str] = set()

    archive = _download(SOURCE_HAN_URL, f"Source Han Serif CN ({SOURCE_HAN_RELEASE})")
    with zipfile.ZipFile(io.BytesIO(archive)) as zf:
        for member in zf.namelist():
            name = os.path.basename(member)
            if name not in wanted or member.endswith("/"):
                continue
            target = os.path.join(dest_dir, name)
            with zf.open(member) as src, open(target, "wb") as dst:
                shutil.copyfileobj(src, dst)
            logger.info("  extracted %s", name)
            written.add(name)

    for name in sorted(set(wanted) - written):
        logger.warning("  NOT FOUND in archive: %s", name)
    return written


def fetch_mplus(weights: List[FontWeight], dest_dir: str) -> Set[str]:
    """Extract the M+ 1m cuts used for the pinyin of the requested weights."""
    logger = get_logger("mengshen.scripts.fetch_fonts")
    wanted = {w.value.alphabet_font for w in weights}
    written: Set[str] = set()

    archive = _download(MPLUS_URL, "M+ TESTFLIGHT 063 (pinyin)")
    # tarfile needs a real seekable file for xz.
    with tempfile.NamedTemporaryFile(suffix=".tar.xz", delete=False) as tmp:
        tmp.write(archive)
        tmp_path = tmp.name
    try:
        with tarfile.open(tmp_path, "r:xz") as tf:
            for member in tf.getmembers():
                name = os.path.basename(member.name)
                if name not in wanted or not member.isfile():
                    continue
                extracted = tf.extractfile(member)
                if extracted is None:
                    continue
                with extracted, open(os.path.join(dest_dir, name), "wb") as dst:
                    shutil.copyfileobj(extracted, dst)
                logger.info("  extracted %s", name)
                written.add(name)
    finally:
        os.unlink(tmp_path)

    for name in sorted(wanted - written):
        logger.warning("  NOT FOUND in archive: %s", name)
    return written


def parse_args(args: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Download Source Han Serif and M+ source fonts."
    )
    parser.add_argument(
        "-w",
        "--weights",
        nargs="+",
        choices=FontWeight.keys(),
        default=FontWeight.keys(),
        help="Weights to fetch (default: all).",
    )
    return parser.parse_args(args)


def fetch_fonts_main(args: Optional[List[str]] = None) -> None:
    """Main entry point for source font retrieval."""
    setup_logging(level="INFO", verbose=False, quiet=False)
    logger = get_logger("mengshen.scripts.fetch_fonts")

    options = parse_args(args)
    weights = [FontWeight.from_key(key) for key in options.weights]
    for weight in weights:
        FontConfig.validate_weight(FontType.HAN_SERIF, weight)

    dest_dir = str(HAN_SERIF_FONT_DIR)
    os.makedirs(dest_dir, exist_ok=True)

    han = fetch_source_han(weights, dest_dir)
    mplus = fetch_mplus(weights, dest_dir)

    logger.info(
        "Done: %d hanzi font(s) and %d pinyin font(s) in %s",
        len(han),
        len(mplus),
        dest_dir,
    )


if __name__ == "__main__":
    fetch_fonts_main()
