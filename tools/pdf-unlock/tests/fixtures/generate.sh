#!/usr/bin/env bash
# Regenerates the encrypted PDF fixtures. Needs qpdf (brew install qpdf) and python3.
# qpdf is an independent PDF implementation, so these test lopdf against real-world output.
set -euo pipefail
cd "$(dirname "$0")"

python3 - <<'EOF'
objs = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R"
    b" /Resources << /Font << /F1 5 0 R >> >> >>",
    None,
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    b"<< /Title (Unlock Fixture) >>",
]
content = b"BT /F1 24 Tf 72 700 Td (Hello from the unlock fixture) Tj ET"
objs[3] = b"<< /Length %d >>\nstream\n" % len(content) + content + b"\nendstream"
out = bytearray(b"%PDF-1.7\n")
offsets = []
for i, body in enumerate(objs, 1):
    offsets.append(len(out))
    out += b"%d 0 obj\n" % i + body + b"\nendobj\n"
xref = len(out)
out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
for off in offsets:
    out += b"%010d 00000 n \n" % off
out += b"trailer\n<< /Size %d /Root 1 0 R /Info 6 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)
open("src.pdf", "wb").write(out)
EOF

# Let qpdf rewrite it so the plain fixture is a normal, well-formed PDF.
qpdf src.pdf plain.pdf
rm src.pdf

enc() {
  local out=$1
  shift
  qpdf --allow-weak-crypto "$@" -- plain.pdf "$out" </dev/null
}

enc rc4-40.pdf             --encrypt --user-password=user --owner-password=owner --bits=40
enc rc4-128.pdf            --encrypt --user-password=user --owner-password=owner --bits=128 --use-aes=n
enc aes-128.pdf            --encrypt --user-password=user --owner-password=owner --bits=128 --use-aes=y
enc aes-256.pdf            --encrypt --user-password=user --owner-password=owner --bits=256
enc aes-256-objstm.pdf     --object-streams=generate --encrypt --user-password=user --owner-password=owner --bits=256
enc aes-256-owner-only.pdf --encrypt --user-password= --owner-password=owner --bits=256 --print=none --extract=n
enc rc4-128-owner-only.pdf --encrypt --user-password= --owner-password=owner --bits=128 --use-aes=n
enc aes-256-utf8.pdf       --encrypt --user-password=contraseña --owner-password=owner --bits=256
enc rc4-128-utf8.pdf       --encrypt --user-password=contraseña --owner-password=owner --bits=128 --use-aes=n

# Crypt filters lopdf 0.45 can't apply (it silently falls back to RC4 for them).
# Same-length byte edits keep the xref offsets valid.
enc aes-128-owner-only.tmp.pdf --encrypt --user-password= --owner-password=owner --bits=128 --use-aes=y
python3 - <<'EOF2'
def edit(src, dst, old, new):
    data = open(src, "rb").read()
    assert len(old) == len(new) and data.count(old) == 1, (src, old)
    open(dst, "wb").write(data.replace(old, new))

edit("aes-128.pdf", "aes-128-unknown-cfm.pdf", b"/CFM /AESV2", b"/CFM /AESV9")
edit("aes-128.pdf", "aes-128-unnamed-stmf.pdf", b"/StmF /StdCF", b"/StmF /NoCF1")
edit("aes-128-owner-only.tmp.pdf", "aes-128-owner-only-unknown-cfm.pdf", b"/CFM /AESV2", b"/CFM /AESV9")
EOF2
rm aes-128-owner-only.tmp.pdf

echo "fixtures regenerated"
