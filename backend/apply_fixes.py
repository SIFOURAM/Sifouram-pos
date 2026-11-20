# apply_fixes.py — otomatis patch server.py: fix race condition + hapus Emergent
import re, shutil, sys
from pathlib import Path

TARGET = Path(__file__).parent / "server.py"
BACKUP = Path(__file__).parent / "server.py.bak"

src = TARGET.read_text(encoding="utf-8")
shutil.copy(TARGET, BACKUP)
print(f"Backup dibuat: {BACKUP}")

def replace_once(old, new, label):
    global src
    if old not in src:
        print(f"[GAGAL] Blok tidak ditemukan: {label}")
        return False
    if src.count(old) != 1:
        print(f"[GAGAL] Blok tidak unik ({src.count(old)}x): {label}")
        return False
    src = src.replace(old, new)
    print(f"[OK] {label}")
    return True

ok = True

# ============ FIX 1: Supabase Storage (ganti Emergent Object Storage) ============
old_storage = '''# ---------- Emergent Object Storage (file & media) ----------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "sifouram"
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        raise HTTPException(404, "File not found")
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")'''

new_storage = '''# ---------- Supabase Storage (file & media) ----------
from supabase import create_client, Client

supabase: Optional[Client] = None


def init_supabase():
    global supabase
    if supabase:
        return supabase
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        logger.warning("Supabase credentials not configured. File uploads will fail.")
        return None
    supabase = create_client(url, key)
    return supabase


def put_object(path: str, data: bytes, content_type: str) -> dict:
    sb = init_supabase()
    if not sb:
        raise HTTPException(503, "Storage service belum dikonfigurasi")
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "sifouram-files")
    try:
        sb.storage.from_(bucket).upload(
            path=path,
            file=data,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        return {"path": path, "size": len(data)}
    except Exception as e:
        logger.error(f"Supabase upload failed: {e}")
        raise HTTPException(500, f"Gagal upload file: {str(e)}")


def get_object(path: str):
    sb = init_supabase()
    if not sb:
        raise HTTPException(503, "Storage service belum dikonfigurasi")
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "sifouram-files")
    try:
        data = sb.storage.from_(bucket).download(path)
    except Exception as e:
        logger.error(f"Supabase download failed for {path}: {e}")
        raise HTTPException(404, "File not found")
    ext = path.split(".")[-1].lower()
    content_type = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "webp": "image/webp", "pdf": "application/pdf",
    }.get(ext, "application/octet-stream")
    return data, content_type'''

ok &= replace_once(old_storage, new_storage, "Storage: Emergent -> Supabase")

# ============ FIX 2: startup init ============
old_start = '''    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")'''
new_start = '''    try:
        init_supabase()
        logger.info("Supabase storage initialized")
    except Exception as e:
        logger.warning(f"Supabase init skipped: {e}")'''
ok &= replace_once(old_start, new_start, "Startup init -> Supabase")

# ============ FIX 3: race condition save_rider_stock ============
old_rider = '''    for mid, qty in body.items.items():
        if mid not in menus:
            raise HTTPException(404, "Menu stock tidak ditemukan")
        delta = qty - prev_items.get(mid, 0)
        if delta > 0 and menus[mid]["stock"] < delta:
            raise HTTPException(400, f"Stock central {menus[mid]['name']} tidak mencukupi")
        if delta:
            changes.append((mid, delta))
    for mid, delta in changes:
        await db.menus.update_one({"id": mid}, {"$inc": {"stock": -delta}})'''

new_rider = '''    deducted: List[tuple] = []
    try:
        for mid, qty in body.items.items():
            if mid not in menus:
                raise HTTPException(404, "Menu stock tidak ditemukan")
            delta = qty - prev_items.get(mid, 0)
            if delta > 0:
                updated = await db.menus.find_one_and_update(
                    {"id": mid, "stock": {"$gte": delta}},
                    {"$inc": {"stock": -delta}},
                    projection=NOID,
                    return_document=ReturnDocument.BEFORE,
                )
                if not updated:
                    current = await db.menus.find_one({"id": mid}, NOID)
                    available = (current or {}).get("stock", 0)
                    raise HTTPException(
                        400,
                        f"Stock central {menus[mid]['name']} tidak mencukupi "
                        f"(tersedia {available}, butuh {delta})",
                    )
                deducted.append((mid, delta))
            elif delta < 0:
                await db.menus.update_one({"id": mid}, {"$inc": {"stock": -delta}})
    except HTTPException:
        for mid, delta in deducted:
            await db.menus.update_one({"id": mid}, {"$inc": {"stock": delta}})
        raise
    except Exception:
        for mid, delta in deducted:
            await db.menus.update_one({"id": mid}, {"$inc": {"stock": delta}})
        raise HTTPException(500, "Gagal memperbarui stok. Coba lagi.")'''
ok &= replace_once(old_rider, new_rider, "Race condition: rider stock (atomic)")

# hapus variabel changes yang tidak dipakai lagi
old_changes = '''    prev_items = prev["items"] if prev else {}
    menus = {m["id"]: m for m in await db.menus.find({}, NOID).to_list(100)}
    changes = []
'''
new_changes = '''    prev_items = prev["items"] if prev else {}
    menus = {m["id"]: m for m in await db.menus.find({}, NOID).to_list(100)}
'''
ok &= replace_once(old_changes, new_changes, "Hapus variabel changes")

# ============ FIX 4: race condition produce ============
old_produce = '''    if body.type == "produce":
        mats = {m["id"]: m for m in await db.materials.find({}, NOID).to_list(200)}
        for r in mn["recipe"]:
            mt = mats.get(r["material_id"])
            if mt and mt.get("category") != "packaging":
                used = r["qty"] * body.qty
                await db.materials.update_one({"id": mt["id"]}, {"$inc": {"stock": -used}})
                await db.inventory_tx.insert_one({"id": uid(), "material_id": mt["id"], "material_name": mt["name"], "unit": mt["unit"], "type": "out", "qty": used,
                                                  "before": mt["stock"], "after": mt["stock"] - used, "cost": 0, "note": f"Production {mn['name']} x{body.qty}",
                                                  "date": body.date, "user": u["name"], "created_at": now_iso()})
        new_stock = mn["stock"] + body.qty'''

new_produce = '''    if body.type == "produce":
        mats = {m["id"]: m for m in await db.materials.find({}, NOID).to_list(200)}
        usage = []
        for r in mn["recipe"]:
            mt = mats.get(r["material_id"])
            if mt and mt.get("category") != "packaging":
                usage.append((mt, r["qty"] * body.qty))
        for mt, used in usage:
            if mt.get("stock", 0) < used:
                raise HTTPException(
                    400,
                    f"Bahan {mt['name']} tidak cukup untuk produksi {body.qty} "
                    f"(tersedia {mt.get('stock', 0)}{mt['unit']}, butuh {used}{mt['unit']})",
                )
        deducted: List[tuple] = []
        try:
            for mt, used in usage:
                prev_m = await db.materials.find_one_and_update(
                    {"id": mt["id"], "stock": {"$gte": used}},
                    {"$inc": {"stock": -used}},
                    projection=NOID,
                    return_document=ReturnDocument.BEFORE,
                )
                if not prev_m:
                    raise HTTPException(
                        400,
                        f"Bahan {mt['name']} baru saja dipakai proses lain. Muat ulang dan coba lagi.",
                    )
                deducted.append((mt["id"], used))
                await db.inventory_tx.insert_one({"id": uid(), "material_id": mt["id"], "material_name": mt["name"], "unit": mt["unit"], "type": "out", "qty": used,
                                                  "before": prev_m["stock"], "after": prev_m["stock"] - used, "cost": 0, "note": f"Production {mn['name']} x{body.qty}",
                                                  "date": body.date, "user": u["name"], "created_at": now_iso()})
        except HTTPException:
            for mid, used in deducted:
                await db.materials.update_one({"id": mid}, {"$inc": {"stock": used}})
            raise
        except Exception:
            for mid, used in deducted:
                await db.materials.update_one({"id": mid}, {"$inc": {"stock": used}})
            raise HTTPException(500, "Gagal mencatat produksi. Coba lagi.")
        new_stock = mn["stock"] + body.qty'''
ok &= replace_once(old_produce, new_produce, "Race condition: produce (atomic + rollback)")

# ============ FIX 5: wastage stok minus ============
old_waste = '''    before = m.get("stock", 0)
    after = before - body.qty
    await db.menus.update_one({"id": body.menu_id}, {"$set": {"stock": after}})'''
new_waste = '''    prev_m = await db.menus.find_one_and_update(
        {"id": body.menu_id, "stock": {"$gte": body.qty}},
        {"$inc": {"stock": -body.qty}},
        projection=NOID,
        return_document=ReturnDocument.BEFORE,
    )
    if not prev_m:
        raise HTTPException(400, f"Stok {m['name']} tidak cukup untuk wastage {body.qty}")
    before = prev_m.get("stock", 0)
    after = before - body.qty'''
ok &= replace_once(old_waste, new_waste, "Race condition: wastage (atomic)")

# ============ FIX 6: extract_expense_receipt -> Groq ============
old_extract = '''    enforce_rate_limit(request, "expense-extract", 8, 300)
    validate_expense_proof(body.proof)
    from emergentintegrations.llm.chat import LlmChat, UserMessage
'''
new_extract = '''    enforce_rate_limit(request, "expense-extract", 8, 300)
    validate_expense_proof(body.proof)
    from groq import AsyncGroq
'''
ok &= replace_once(old_extract, new_extract, "Extract receipt: import Groq")

old_extract2 = '''    async def extract_with(model: str) -> dict:
        chat = LlmChat(
            api_key=os.environ["EMERGENT_LLM_KEY"],
            session_id=f"expense-extract-{u['id']}-{uid()}",
            system_message="Kamu adalah asisten ekstraksi struk yang teliti.",
        ).with_model("gemini", model)
        result = await chat.send_message(UserMessage(text=prompt, file_contents=[body.proof]))
        draft = receipt_draft(receipt_json(result))
        draft["model"] = model
        return draft
    try:
        draft = await extract_with("gemini-3.8-flash")
        if draft["confidence"] < 0.8 or not draft["amount"]:
            draft = await extract_with("gemini-3.1-pro-preview")
    except Exception as error:
        logger.exception("Expense receipt extraction failed")
        raise HTTPException(
            424,
            "AI tidak dapat membaca bukti saat ini. Isi data secara manual.",
        ) from error
    return draft'''

new_extract2 = '''    groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    try:
        completion = await groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": "Kamu adalah asisten ekstraksi struk yang teliti."},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": body.proof}},
                ]},
            ],
            temperature=0.2,
            max_tokens=800,
        )
        result = completion.choices[0].message.content
        draft = receipt_draft(receipt_json(result))
        draft["model"] = "llama-4-scout"
    except Exception as error:
        logger.exception("Expense receipt extraction failed")
        raise HTTPException(
            424,
            "AI tidak dapat membaca bukti saat ini. Isi data secara manual.",
        ) from error
    return draft'''
ok &= replace_once(old_extract2, new_extract2, "Extract receipt: Groq vision")

# ============ FIX 7: coach_chat -> Groq ============
old_coach = '''    from emergentintegrations.llm.chat import LlmChat, UserMessage
    d = datetime.now(WIB).strftime("%Y-%m-%d")'''
new_coach = '''    from groq import AsyncGroq
    d = datetime.now(WIB).strftime("%Y-%m-%d")'''
ok &= replace_once(old_coach, new_coach, "Coach: import Groq")

old_coach2 = '''    models = {"gpt-terra": ("openai", "gpt-5.6-terra"), "gpt": ("openai", "gpt-5.4"), "claude-sonnet": ("anthropic", "claude-sonnet-5-5"), "claude": ("anthropic", "claude-sonnet-4-6"), "gemini": ("gemini", "gemini-3.8-flash")}
    prov, model = models.get(body.provider or "gemini", ("gemini", "gemini-3.8-flash"))
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=f"coach-{u['id']}-{session_id}",
        system_message=system,
    ).with_model(prov, model)
    try:
        reply = await chat.send_message(UserMessage(text=body.message))
    except Exception as error:'''
new_coach2 = '''    models = {
        "llama": "llama-3.3-70b-versatile",
        "llama-70b": "llama-3.3-70b-versatile",
        "mixtral": "mixtral-8x7b-32768",
        "gemma": "gemma2-9b-it",
        "gpt": "llama-3.3-70b-versatile",
        "gemini": "llama-3.3-70b-versatile",
        "claude": "llama-3.3-70b-versatile",
    }
    model = models.get(body.provider or "llama", "llama-3.3-70b-versatile")
    groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    try:
        completion = await groq_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": body.message},
            ],
            temperature=0.8,
            max_tokens=600,
        )
        reply = completion.choices[0].message.content
    except Exception as error:'''
ok &= replace_once(old_coach2, new_coach2, "Coach: Groq chat")

# ============ FIX 8: promo_idea -> Groq ============
old_promo = '''    from emergentintegrations.llm.chat import LlmChat, UserMessage
    system = ("Kamu copywriter promosi WhatsApp untuk 'SI FOUR AM', kopi gerobak keliling (Rp5.000\u201312.000/cup, ada bundling 4 cup Rp45.000 & 10 cup Rp110.000). "
              "Buat 1 pesan promo WhatsApp Bahasa Indonesia yang singkat (maks 60 kata), hangat, persuasif, pakai emoji secukupnya, sebut nama toko SI FOUR AM, ada ajakan beli & sebut bundling. "
              "Boleh pakai token {nama} sebagai sapaan nama pelanggan. Jangan pakai placeholder kurung siku lain. Balas HANYA teks pesannya saja.")
    chat = LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=f"promo-{u['id']}", system_message=system).with_model("openai", "gpt-5.4-mini")
    text = await chat.send_message(UserMessage(text=(body.theme or "promo menarik hari ini untuk menarik pelanggan")))
    return {"text": text}'''

new_promo = '''    from groq import AsyncGroq
    system = ("Kamu copywriter promosi WhatsApp untuk 'SI FOUR AM', kopi gerobak keliling (Rp5.000\u201312.000/cup, ada bundling 4 cup Rp45.000 & 10 cup Rp110.000). "
              "Buat 1 pesan promo WhatsApp Bahasa Indonesia yang singkat (maks 60 kata), hangat, persuasif, pakai emoji secukupnya, sebut nama toko SI FOUR AM, ada ajakan beli & sebut bundling. "
              "Boleh pakai token {nama} sebagai sapaan nama pelanggan. Jangan pakai placeholder kurung siku lain. Balas HANYA teks pesannya saja.")
    groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))
    try:
        completion = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": body.theme or "promo menarik hari ini untuk menarik pelanggan"},
            ],
            temperature=0.9,
            max_tokens=200,
        )
        text = completion.choices[0].message.content
    except Exception as error:
        logger.exception("Promo generation failed")
        raise HTTPException(424, "AI promo belum dapat merespons. Coba lagi.") from error
    return {"text": text}'''
ok &= replace_once(old_promo, new_promo, "Promo: Groq")

# ============ FIX 9: Google OAuth -> Supabase Auth ============
old_google = '''    try:
        result = await run_in_threadpool(
            requests.get,
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=12,
        )
        if 400 <= result.status_code < 500:
            raise HTTPException(401, "Sesi Google tidak valid atau telah kedaluwarsa")
        result.raise_for_status()
        google = result.json()
    except HTTPException:
        raise
    except requests.RequestException as error:
        raise HTTPException(424, "Google Sign-In belum dapat diverifikasi") from error
    if google.get("email_verified") is False:
        raise HTTPException(401, "Email Google harus terverifikasi")
    email = str(google.get("email") or "").strip().lower()'''

new_google = '''    sb = init_supabase()
    if not sb:
        raise HTTPException(503, "Supabase Auth belum dikonfigurasi")
    try:
        auth_user = sb.auth.get_user(session_id)
        if not auth_user or not auth_user.user:
            raise HTTPException(401, "Sesi Google tidak valid atau telah kedaluwarsa")
        google = {
            "email": auth_user.user.email,
            "name": (auth_user.user.user_metadata or {}).get("full_name", auth_user.user.email),
            "email_verified": auth_user.user.email_confirmed_at is not None,
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(424, "Google Sign-In belum dapat diverifikasi") from error
    if google.get("email_verified") is False:
        raise HTTPException(401, "Email Google harus terverifikasi")
    email = str(google.get("email") or "").strip().lower()'''
ok &= replace_once(old_google, new_google, "Google OAuth: Supabase Auth")

# ============ SIMPAN ============
if not ok:
    print("\nADA BLOK GAGAL. File TIDAK disimpan. Cek pesan [GAGAL] di atas.")
    sys.exit(1)

TARGET.write_text(src, encoding="utf-8")
print(f"\nSUKSES! server.py sudah dipatch. Backup asli: {BACKUP}")
print("Sisa referensi 'emergent':", src.count("emergent"))