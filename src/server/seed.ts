import * as mongo from './models';
import { fileModels } from './file-db';
import { dbEngine } from './db';

async function ensureKind(ClothKind: any, name: string) {
  const existing = await ClothKind.findOne({ name }).lean();
  if (existing) return existing;
  const created = await ClothKind.create({ name });
  return created.toObject ? created.toObject() : created;
}

export async function seedLookups() {
  const { Color, Size, ClothKind, ClothStyle } = dbEngine() === 'file' ? fileModels : mongo;
  const [colors, sizes, kinds] = await Promise.all([
    Color.countDocuments(),
    Size.countDocuments(),
    ClothKind.countDocuments(),
  ]);
  if (!colors) {
    await Color.insertMany([{ name: 'سرمه‌ای' }, { name: 'خاکی' }, { name: 'سفید' }, { name: 'کرم' }, { name: 'مشکی' }]);
  }
  if (!kinds) {
    await ClothKind.insertMany([{ name: 'شلوار جین' }, { name: 'شلوار کتان' }]);
  }
  const jean = await ensureKind(ClothKind, 'شلوار جین');
  await ensureKind(ClothKind, 'شلوار کتان');
  const jeanStyles = await ClothStyle.countDocuments({ _clothKind: jean._id });
  if (!jeanStyles) {
    await ClothStyle.insertMany([
      { name: 'شلوار راسته', _clothKind: jean._id },
      { name: 'شلوار مام', _clothKind: jean._id },
    ]);
  }
  if (!sizes) {
    await Size.insertMany(['S', 'M', 'L', 'XL', 'XXL'].map((name) => ({ name, _clothKind: jean?._id })));
  } else {
    const jeanSizes = await Size.countDocuments({ _clothKind: jean._id });
    if (!jeanSizes) {
      await Size.insertMany(['S', 'M', 'L', 'XL', 'XXL'].map((name) => ({ name, _clothKind: jean._id })));
    }
  }
}
