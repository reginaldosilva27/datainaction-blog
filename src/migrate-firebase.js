// Lê ./data/wix-posts.json, baixa as imagens hospedadas no Wix, re-envia ao
// Firebase Storage, substitui as URLs no conteúdo e grava cada post no Firestore.
//
//   npm run migrate
//
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import admin from 'firebase-admin';

const COLLECTION = process.env.FIRESTORE_COLLECTION || 'blog_posts';
const STORAGE_FOLDER = process.env.STORAGE_FOLDER || 'blog-images';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
const CREDS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!BUCKET || !CREDS) {
  console.error('\n❌ Faltam FIREBASE_STORAGE_BUCKET e/ou GOOGLE_APPLICATION_CREDENTIALS no .env\n');
  process.exit(1);
}

// ---- Firebase init ----
const serviceAccount = JSON.parse(await readFile(CREDS, 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: BUCKET,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Cache: media id/url do Wix -> URL pública no Firebase (evita upload duplicado)
const uploaded = new Map();

// ---- Helpers de imagem ----

// Converte uma referência de imagem do Wix numa URL pública baixável.
// Aceita: "wix:image://v1/<id>/...", "<id>~mv2.jpg", ou URL completa static.wixstatic.com
function wixImageToUrl(ref) {
  if (!ref) return null;
  if (ref.startsWith('http')) return ref.split('#')[0]; // já é URL
  let id = ref;
  if (ref.startsWith('wix:image://')) {
    // wix:image://v1/<MEDIA_ID>/<filename>#...
    id = ref.replace('wix:image://v1/', '').split('/')[0].split('#')[0];
  }
  return `https://static.wixstatic.com/media/${id}`;
}

function extFromUrl(url, fallback = 'jpg') {
  const m = url.split('?')[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : fallback;
}

async function downloadAndUpload(ref, postId) {
  const url = wixImageToUrl(ref);
  if (!url) return null;
  if (uploaded.has(url)) return uploaded.get(url);

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`   ⚠️  imagem não baixou (${res.status}): ${url}`);
    return null;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'image/jpeg';

  const ext = extFromUrl(url, contentType.split('/')[1] || 'jpg');
  const safe = url.split('/').pop().split('?')[0].replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = `${STORAGE_FOLDER}/${postId}/${safe || `img.${ext}`}`;

  const file = bucket.file(dest);
  await file.save(buffer, { metadata: { contentType }, resumable: false });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${dest}`;

  uploaded.set(url, publicUrl);
  return publicUrl;
}

// Percorre o Ricos richContent, troca cada imagem por sua nova URL no Firebase.
async function migrateRichContent(richContent, postId) {
  if (!richContent?.nodes) return richContent;

  async function walk(node) {
    if (node.type === 'IMAGE' && node.imageData?.image?.src) {
      const src = node.imageData.image.src;
      const ref = src.id || src.url;
      const newUrl = await downloadAndUpload(ref, postId);
      if (newUrl) {
        src.url = newUrl;
        delete src.id; // remove o id do Wix para forçar uso da URL nova
      }
    }
    // Galerias e outros nós que possam conter imagens
    if (node.galleryData?.items) {
      for (const item of node.galleryData.items) {
        const ref = item.image?.media?.src?.id || item.image?.media?.src?.url;
        const newUrl = await downloadAndUpload(ref, postId);
        if (newUrl && item.image?.media?.src) {
          item.image.media.src.url = newUrl;
          delete item.image.media.src.id;
        }
      }
    }
    if (Array.isArray(node.nodes)) {
      for (const child of node.nodes) await walk(child);
    }
  }

  for (const node of richContent.nodes) await walk(node);
  return richContent;
}

// Imagem de capa do post
async function migrateCover(post) {
  const src =
    post.media?.wixMedia?.image?.id ||
    post.media?.wixMedia?.image?.url ||
    post.coverMedia?.image?.id ||
    post.coverImage;
  if (!src) return null;
  return downloadAndUpload(src, post.id);
}

// ---- Main ----
async function main() {
  const raw = await readFile('./data/wix-posts.json', 'utf-8').catch(() => {
    console.error('\n❌ ./data/wix-posts.json não encontrado. Rode primeiro: npm run export\n');
    process.exit(1);
  });
  const posts = JSON.parse(raw);
  console.log(`📦 ${posts.length} posts a migrar para Firestore/${COLLECTION}\n`);

  let ok = 0;
  for (const post of posts) {
    try {
      console.log(`→ ${post.title || post.id}`);
      const coverUrl = await migrateCover(post);
      const richContent = await migrateRichContent(post.richContent, post.id);

      const doc = {
        wixId: post.id,
        title: post.title ?? '',
        slug: post.slug ?? '',
        excerpt: post.excerpt ?? '',
        contentText: post.contentText ?? '',
        richContent: richContent ?? null,
        coverImage: coverUrl,
        wixUrl: post.url?.path ?? post.url ?? null,
        memberId: post.memberId ?? null,
        categoryIds: post.categoryIds ?? [],
        hashtags: post.hashtags ?? [],
        tagIds: post.tagIds ?? [],
        firstPublishedDate: post.firstPublishedDate ?? null,
        lastPublishedDate: post.lastPublishedDate ?? null,
        pinned: post.pinned ?? false,
        featured: post.featured ?? false,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection(COLLECTION).doc(post.id).set(doc, { merge: true });
      ok++;
    } catch (err) {
      console.error(`   💥 falhou: ${err.message}`);
    }
  }

  console.log(`\n✅ ${ok}/${posts.length} posts gravados no Firestore.`);
  console.log(`🖼️  ${uploaded.size} imagens migradas para o Storage.`);
}

main().catch((err) => {
  console.error('\n💥 Erro na migração:\n', err);
  process.exit(1);
});
