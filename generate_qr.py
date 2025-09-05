
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
QR Generator for GRID Loyalty
Usage:
  python generate_qr.py --base-url "https://votredomaine.fr/scan?qr=" --count 200 --out ./qr_output

Requires: pip install qrcode[pil] pandas
"""
import argparse, os, pandas as pd
import qrcode

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base-url", required=True, help="Base URL e.g. https://domaine.fr/scan?qr=")
    p.add_argument("--count", type=int, default=100)
    p.add_argument("--out", default="./qr_output")
    args = p.parse_args()

    os.makedirs(args.out, exist_ok=True)
    rows = []
    for i in range(1, args.count+1):
        qr_id = f"qr_{i:05d}"
        url = f"{args.base_url}{qr_id}"
        img = qrcode.make(url)
        img.save(os.path.join(args.out, f"{qr_id}.png"))
        rows.append({"qr_id": qr_id, "url": url, "status": "new"})
    df = pd.DataFrame(rows)
    df.to_csv(os.path.join(args.out, "qr_list.csv"), index=False)
    print(f"Generated {args.count} QR codes in {args.out}")

if __name__ == "__main__":
    main()
