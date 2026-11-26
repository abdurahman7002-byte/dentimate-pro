'use strict';
// Windows replacement for the Linux/macOS-only native module fs-xattr, used by
// supabase/storage-api's file backend to keep per-file metadata (content-type,
// cache-control, etag). NTFS alternate data streams ("file:name") carry the same
// per-file metadata and move with the file on rename. Requires an NTFS volume.
const fs = require('node:fs');
const missing = () => Object.assign(new Error('attribute not found'), { code: 'ENODATA' });
const stream = (file, attr) => `${file}:${String(attr).replace(/[^\w.\-]/g, '_')}`;
exports.getAttributeSync = (file, attr) => {
  try { return fs.readFileSync(stream(file, attr)); }
  catch (e) { if (e && (e.code === 'ENOENT' || e.code === 'EINVAL')) throw missing(); throw e; }
};
exports.setAttributeSync = (file, attr, value) => { fs.writeFileSync(stream(file, attr), Buffer.from(String(value))); };
exports.removeAttributeSync = (file, attr) => {
  try { fs.unlinkSync(stream(file, attr)); }
  catch (e) { if (e && (e.code === 'ENOENT' || e.code === 'EINVAL')) throw missing(); throw e; }
};
const wrap = (sync) => async (...a) => sync(...a);
exports.getAttribute = wrap(exports.getAttributeSync);
exports.setAttribute = wrap(exports.setAttributeSync);
exports.removeAttribute = wrap(exports.removeAttributeSync);
exports.listAttributes = async () => [];
