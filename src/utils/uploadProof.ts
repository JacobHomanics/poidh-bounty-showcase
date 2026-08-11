/**
 * Claim proof upload aligned with poidh.xyz metadata shape:
 * 1) pin image to IPFS (Pinata)
 * 2) pin ERC-721 metadata JSON that references an HTTPS gateway image URL
 * 3) return an HTTPS gateway metadata URL for createClaim(..., uri)
 *
 * Important: poidh's indexer fetches the on-chain URI over HTTP. Storing
 * `ipfs://…` leaves imageUrl null. Their dedicated upload API also only
 * allows Origin https://poidh.xyz (CORS), so we pin with Pinata directly and
 * write public HTTPS gateway links instead.
 */

const PINATA_JWT = (process.env.EXPO_PUBLIC_PINATA_JWT ?? '').trim();

/** Public gateway — works for pins from any Pinata account. */
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

export type ClaimMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: never[];
};

function toGatewayUri(cid: string): string {
  const cleaned = cid
    .trim()
    .replace(/^ipfs:\/\//, '')
    .replace(/^https?:\/\/[^/]+\/ipfs\//, '');
  return `${IPFS_GATEWAY}/${cleaned}`;
}

/** Normalize pasted proof URLs into HTTP gateway links when needed. */
export function normalizeProofUri(uri: string): string {
  const value = uri.trim();
  if (!value) return value;
  if (value.startsWith('ipfs://')) {
    return toGatewayUri(value);
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
  let response: Response;
  try {
    response = await fetch(uri);
  } catch {
    throw new Error('Could not read the selected image — try picking it again');
  }
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

function requirePinataJwt() {
  if (!PINATA_JWT) {
    throw new Error(
      'Set EXPO_PUBLIC_PINATA_JWT in .env to upload claim proofs',
    );
  }
}

async function pinFileToIpfs(file: File): Promise<string> {
  requirePinataJwt();
  const body = new FormData();
  body.append('file', file);
  body.append('pinataMetadata', JSON.stringify({ name: file.name || 'claim.jpg' }));

  let response: Response;
  try {
    response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body,
    });
  } catch {
    throw new Error('Image upload failed — check your network and try again');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata image upload failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const json = (await response.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error('Pinata did not return an IPFS hash for the image');
  return toGatewayUri(json.IpfsHash);
}

async function pinJsonToIpfs(metadata: ClaimMetadata, name: string): Promise<string> {
  requirePinataJwt();
  let response: Response;
  try {
    response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name },
      }),
    });
  } catch {
    throw new Error('Metadata upload failed — check your network and try again');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata metadata upload failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const json = (await response.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error('Pinata did not return an IPFS hash for metadata');
  return toGatewayUri(json.IpfsHash);
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
 * Upload image + metadata, returning the metadata URI for createClaim.
 * If `existingImageUri` is already a public URL, skip image upload.
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
      throw new Error('Pick a proof photo');
    }
    const file = await uriToImageFile(options.localImageUri, 'claim.jpg');
    imageUri = await pinFileToIpfs(file);
  }

  const metadata = buildClaimMetadata(imageUri, name, description);
  return pinJsonToIpfs(metadata, `poidh-claim-${name.slice(0, 48)}`);
}
