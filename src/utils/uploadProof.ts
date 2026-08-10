/**
 * Claim proof upload aligned with poidh.xyz FormClaim:
 * 1) upload image via poidh's Pinata backend (so their gateway can serve it)
 * 2) upload ERC-721 metadata that references the gateway image URL
 * 3) return the gateway metadata URL for createClaim(..., uri)
 *
 * poidh's indexer resolves imageUrl by fetching the on-chain URI. Their
 * dedicated gateway only serves content pinned to their Pinata account, so
 * pinning with a personal JWT + storing ipfs:// CIDs leaves imageUrl null.
 */

const POIDH_UPLOAD_API =
  'https://us-central1-plated-hangout-393021.cloudfunctions.net/poidh';

/** Same dedicated gateway URL poidh.xyz writes on-chain and into metadata. */
const POIDH_IPFS_GATEWAY =
  'https://beige-impossible-dragon-883.mypinata.cloud/ipfs';

export type ClaimMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: never[];
};

function toPoidhGatewayUri(cid: string): string {
  const cleaned = cid
    .trim()
    .replace(/^ipfs:\/\//, '')
    .replace(/^https?:\/\/[^/]+\/ipfs\//, '');
  return `${POIDH_IPFS_GATEWAY}/${cleaned}`;
}

/** Normalize pasted proof URLs so metadata/on-chain URIs stay HTTP gateway links. */
export function normalizeProofUri(uri: string): string {
  const value = uri.trim();
  if (!value) return value;
  if (value.startsWith('ipfs://')) {
    return toPoidhGatewayUri(value);
  }
  return value;
}

async function compressImage(file: Blob, maxDimension = 1280, quality = 0.8): Promise<Blob> {
  if (typeof document === 'undefined') return file;
  // iOS photo-picker blobs often have an empty MIME type.
  const type = file.type || 'image/jpeg';
  if (!type.startsWith('image/')) return file;
  if (file.size < 100 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && type === 'image/jpeg') return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    });
    return compressed ?? file;
  } catch {
    return file;
  }
}

/**
 * Eagerly copy image bytes into a File. iOS Safari can revoke lazy gallery
 * blob URLs between pick and submit, which otherwise uploads as empty.
 */
export async function uriToImageFile(uri: string, filename = 'claim.jpg'): Promise<File> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read the selected image');
  }
  const raw = await response.blob();
  if (raw.size === 0) {
    throw new Error('Selected image was empty — try picking the photo again');
  }
  const buffer = await raw.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('Selected image was empty — try picking the photo again');
  }
  const typed = new Blob([buffer], {
    type: raw.type && raw.type.startsWith('image/') ? raw.type : 'image/jpeg',
  });
  const processed = await compressImage(typed);
  const finalBuffer = await processed.arrayBuffer();
  return new File([finalBuffer], filename, {
    type: processed.type || 'image/jpeg',
    lastModified: Date.now(),
  });
}

/** @deprecated Prefer uriToImageFile — kept for any call sites that still expect a Blob. */
export async function uriToBlob(uri: string): Promise<Blob> {
  return uriToImageFile(uri);
}

async function uploadFileToPoidh(file: File): Promise<string> {
  const body = new FormData();
  body.append('image', file);

  const response = await fetch(`${POIDH_UPLOAD_API}/uploadFile`, {
    method: 'POST',
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image upload failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const json = (await response.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error('Upload did not return an IPFS hash for the image');
  return toPoidhGatewayUri(json.IpfsHash);
}

async function uploadMetadataToPoidh(metadata: ClaimMetadata): Promise<string> {
  const response = await fetch(`${POIDH_UPLOAD_API}/uploadMetadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Metadata upload failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const json = (await response.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error('Upload did not return an IPFS hash for metadata');
  return toPoidhGatewayUri(json.IpfsHash);
}

export function buildClaimMetadata(
  imageUri: string,
  name: string,
  description: string,
): ClaimMetadata {
  return {
    name,
    description,
    image: imageUri,
    external_url: 'https://poidh.xyz/',
    attributes: [],
  };
}

/**
 * Upload image + metadata like poidh.xyz, returning the metadata URI for createClaim.
 * If `existingImageUri` is already a public URL (manual paste), skip image upload.
 */
export async function prepareClaimUri(options: {
  name: string;
  description: string;
  localImageUri?: string | null;
  existingImageUri?: string | null;
}): Promise<string> {
  const name = options.name.trim();
  const description = options.description.trim();
  if (!name || !description) {
    throw new Error('Name and description are required for claim metadata');
  }

  let imageUri = normalizeProofUri(options.existingImageUri ?? '');
  if (!imageUri) {
    if (!options.localImageUri) {
      throw new Error('Pick a proof photo or paste an image URL');
    }
    const file = await uriToImageFile(options.localImageUri, 'claim.jpg');
    imageUri = await uploadFileToPoidh(file);
  }

  const metadata = buildClaimMetadata(imageUri, name, description);
  return uploadMetadataToPoidh(metadata);
}
