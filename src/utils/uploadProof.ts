/**
 * Claim proof upload aligned with poidh.xyz:
 * 1) pin image to IPFS (Pinata)
 * 2) pin ERC-721-style metadata JSON that references the image
 * 3) return the metadata URI for createClaim(..., uri)
 */

const PINATA_JWT = (process.env.EXPO_PUBLIC_PINATA_JWT ?? '').trim();

export type ClaimMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: never[];
};

/** Canonical IPFS URI used on-chain and inside metadata (poidh / ERC-721 style). */
function toIpfsUri(cid: string): string {
  const cleaned = cid.trim().replace(/^ipfs:\/\//, '');
  return `ipfs://${cleaned}`;
}

async function compressImage(file: Blob, maxDimension = 1280, quality = 0.82): Promise<Blob> {
  if (typeof document === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;
  if (file.size < 120_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;
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

export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read the selected image');
  }
  return response.blob();
}

function requirePinataJwt() {
  if (!PINATA_JWT) {
    throw new Error(
      'Set EXPO_PUBLIC_PINATA_JWT in .env to upload claim proofs the same way as poidh.xyz',
    );
  }
}

async function pinFileToIpfs(file: Blob, filename: string): Promise<string> {
  requirePinataJwt();
  const body = new FormData();
  body.append('file', file, filename);
  body.append('pinataMetadata', JSON.stringify({ name: filename }));

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata image upload failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const json = (await response.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error('Pinata did not return an IPFS hash for the image');
  return toIpfsUri(json.IpfsHash);
}

async function pinJsonToIpfs(metadata: ClaimMetadata, name: string): Promise<string> {
  requirePinataJwt();
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
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
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata metadata upload failed (${response.status}): ${text.slice(0, 160)}`);
  }
  const json = (await response.json()) as { IpfsHash?: string };
  if (!json.IpfsHash) throw new Error('Pinata did not return an IPFS hash for metadata');
  return toIpfsUri(json.IpfsHash);
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

  let imageUri = (options.existingImageUri ?? '').trim();
  if (!imageUri) {
    if (!options.localImageUri) {
      throw new Error('Pick a proof photo or paste an image URL');
    }
    const raw = await uriToBlob(options.localImageUri);
    const file = await compressImage(raw);
    imageUri = await pinFileToIpfs(file, 'claim.jpg');
  }

  const metadata = buildClaimMetadata(imageUri, name, description);
  return pinJsonToIpfs(metadata, `poidh-claim-${name.slice(0, 48)}`);
}
