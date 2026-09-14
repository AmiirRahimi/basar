import * as mongo from './models';
import { fileModels } from './file-db';
import { dbEngine } from './db';

export async function seedLookups() {
  const { Color, Size, ClothKind } = dbEngine() === 'file' ? fileModels : mongo;
  const [colors, sizes, kinds] = await Promise.all([
    Color.countDocuments(),
    Size.countDocuments(),
    ClothKind.countDocuments(),
  ]);
  if (!colors) {
    await Color.insertMany([{ name: 'سرمه‌ای' }, { name: 'خاکی' }, { name: 'سفید' }, { name: 'کرم' }, { name: 'مشکی' }]);
  }
  if (!kinds) {
    await ClothKind.insertMany([{ name: 'شلوار کتان' }, { name: 'پیراهن' }, { name: 'کت' }, { name: 'بافت' }]);
  }
  if (!sizes) {
    const kind = await ClothKind.findOne().lean();
    await Size.insertMany(['S', 'M', 'L', 'XL', 'XXL'].map((name) => ({ name, _clothKind: (kind as any)?._id })));
  }
}
