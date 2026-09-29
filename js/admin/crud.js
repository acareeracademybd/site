// Generic "list + add/edit/delete" admin page used by Courses, E-books, Blog, Testimonials
import { sb, must, esc, icon, table, iconBtn, onActions, openForm, toast, reorder, $ } from '../admin.js';

export function crudPage(content, cfg) {
  let rows = [];
  let query = '';

  const hasStatus = cfg.fields.some((f) => f.name === 'status');

  async function load() {
    let q = sb.from(cfg.table).select(cfg.select || '*');
    for (const [col, asc] of cfg.order || [['created_at', false]]) q = q.order(col, { ascending: asc });
    rows = must(await q);
    if (cfg.afterLoad) await cfg.afterLoad(rows);
    render();
  }

  function visible() {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => (cfg.searchKeys || ['title']).some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }

  function render() {
    const list = visible();
    $('#crud-table', content).innerHTML = table(cfg.columns, list, {
      empty: cfg.empty || 'Nothing here yet. Click "Add" to create the first one.',
      actions: (r, i) => [
        cfg.reorderable && !query ? iconBtn('up', 'up', 'Move up', false, i === 0) + iconBtn('down', 'down', 'Move down', false, i === list.length - 1) : '',
        cfg.extraActions ? cfg.extraActions(r) : '',
        cfg.viewUrl && r.status === 'published' ? `<a class="icon-btn" href="${esc(cfg.viewUrl(r))}" target="_blank" rel="noopener" title="View on website">${icon('eye')}</a>` : '',
        hasStatus ? iconBtn('toggle', r.status === 'published' ? 'lock' : 'globe', r.status === 'published' ? 'Unpublish (hide)' : 'Publish') : '',
        iconBtn('edit', 'edit', 'Edit'),
        iconBtn('delete', 'trash', 'Delete', true),
      ].join(''),
    });
  }

  function edit(row) {
    openForm({
      title: row ? `Edit: ${row[cfg.labelKey || 'title']}` : (cfg.addLabel || 'Add new'),
      fields: cfg.fields,
      values: row || cfg.defaults || {},
      wide: cfg.wide,
      intro: cfg.intro || '',
      onSubmit: async (v) => {
        if (cfg.beforeSave) await cfg.beforeSave(v, row);
        if (row) must(await sb.from(cfg.table).update(v).eq('id', row.id));
        else {
          if (cfg.reorderable && v.sort_order == null) v.sort_order = rows.length + 1;
          must(await sb.from(cfg.table).insert(v));
        }
        toast('Saved');
        if (cfg.afterSave) await cfg.afterSave(v, row);
        await load();
      },
    });
  }

  content.innerHTML = `
    ${cfg.help ? `<div class="help" style="margin-bottom:16px">${cfg.help}</div>` : ''}
    <div class="toolbar">
      <div class="left"><input class="input" type="search" id="crud-search" placeholder="Search…" aria-label="Search"></div>
      <button class="btn btn-primary" type="button" id="crud-add">${icon('plus')} ${esc(cfg.addLabel || 'Add')}</button>
    </div>
    <div id="crud-table"><div class="skeleton" style="min-height:200px"></div></div>`;

  $('#crud-add', content).addEventListener('click', () => edit(null));
  $('#crud-search', content).addEventListener('input', (e) => { query = e.target.value.trim(); render(); });

  onActions(content, visible, {
    edit: (r) => edit(r),
    toggle: async (r) => {
      must(await sb.from(cfg.table).update({ status: r.status === 'published' ? 'draft' : 'published' }).eq('id', r.id));
      toast(r.status === 'published' ? 'Hidden from website' : 'Published');
      await load();
    },
    delete: async (r) => {
      const warn = cfg.deleteWarning ? await cfg.deleteWarning(r) : '';
      if (!confirm(`Delete "${r[cfg.labelKey || 'title']}"?${warn ? '\n\n' + warn : ''}\n\nThis cannot be undone.`)) return;
      must(await sb.from(cfg.table).delete().eq('id', r.id));
      if (cfg.afterDelete) await cfg.afterDelete(r);
      toast('Deleted');
      await load();
    },
    up: async (r, i) => { await reorder(cfg.table, rows, i, -1); await load(); },
    down: async (r, i) => { await reorder(cfg.table, rows, i, 1); await load(); },
    ...(cfg.extraHandlers ? cfg.extraHandlers(load) : {}),
  });

  load();
  return { load, edit };
}
