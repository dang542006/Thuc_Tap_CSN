import { customerRepository } from '../repositories/customer.repository.js';

export const categoryService = {
  async list() {
    const categories = await customerRepository.listCategories();
    const byParent = new Map();
    for (const category of categories) {
      const key = category.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(category);
    }
    const toNode = (category) => {
      const children = (byParent.get(category.id) ?? []).map(toNode);
      const directCount = category._count.books;
      const bookCount = directCount + children.reduce((sum, child) => sum + child.bookCount, 0);
      const { _count, ...publicCategory } = category;
      return { ...publicCategory, directBookCount: directCount, bookCount, children };
    };
    const roots = (byParent.get(null) ?? []).map(toNode);
    const flatten = (node, parentId = null) => {
      const { children, ...flatNode } = node;
      return [{ ...flatNode, parentId }, ...children.flatMap((child) => flatten(child, node.id))];
    };
    return roots.flatMap((node) => flatten(node));
  },
};
