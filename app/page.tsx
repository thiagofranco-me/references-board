'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ExternalLink,
  Grid2X2,
  ImagePlus,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

type ReferenceType = 'Site' | 'Mobile' | 'Desktop';
type View = 'collection' | 'detail' | 'editor';

type Screenshot = {
  id: string;
  label: string;
  src?: string;
  notes: string[];
};

type Reference = {
  id: string;
  title: string;
  type: ReferenceType;
  url: string;
  updatedAt: number;
  coverId: string;
  screenshots: Screenshot[];
};

type Draft = Omit<Reference, 'id' | 'updatedAt'> & { id?: string };
type ConfirmState =
  | { kind: 'discard' }
  | { kind: 'delete' }
  | { kind: 'remove-screen'; screenId: string }
  | null;

const tones = ['tone-a', 'tone-b', 'tone-c', 'tone-d', 'tone-e', 'tone-f'];
const uid = () => Math.random().toString(36).slice(2, 10);

function makeScreens(title: string, count: number): Screenshot[] {
  const sampleNotes = [
    'A navegação principal permanece visível e organiza as funcionalidades por contexto.',
    'A ação mais importante ocupa a área central, com poucos elementos concorrentes.',
    'O menu contextual aparece próximo ao conteúdo que será afetado.',
    'A hierarquia combina título, ação principal e conteúdo exploratório.',
    'O encerramento do fluxo mantém a próxima ação evidente.',
    'O sistema usa densidade baixa para tornar a leitura mais confortável.',
    'Os controles secundários ficam disponíveis sem competir com a tarefa atual.',
  ];
  return Array.from({ length: count }, (_, index) => ({
    id: `${title.toLowerCase().replaceAll(' ', '-')}-${index + 1}`,
    label: `${title} · Screenshot ${String(index + 1).padStart(2, '0')}`,
    notes: index % 3 === 2 ? [] : [sampleNotes[index % sampleNotes.length]],
  }));
}

const initialReferences: Reference[] = [
  { id: 'elevenlabs', title: 'ElevenLabs', type: 'Desktop', url: 'https://elevenlabs.io', updatedAt: Date.now(), coverId: 'elevenlabs-1', screenshots: makeScreens('ElevenLabs', 5) },
  { id: 'craft', title: 'Craft', type: 'Desktop', url: 'https://craft.do', updatedAt: Date.now() - 2 * 86400000, coverId: 'craft-2', screenshots: makeScreens('Craft', 7) },
  { id: 'cowboy', title: 'Cowboy', type: 'Site', url: 'https://cowboy.com', updatedAt: Date.now() - 8 * 86400000, coverId: 'cowboy-1', screenshots: makeScreens('Cowboy', 6) },
  { id: 'apple-music', title: 'Apple Music', type: 'Mobile', url: 'https://music.apple.com', updatedAt: Date.now() - 12 * 86400000, coverId: 'apple-music-3', screenshots: makeScreens('Apple Music', 4) },
  { id: 'mailchimp', title: 'Mailchimp', type: 'Site', url: 'https://mailchimp.com', updatedAt: Date.now() - 21 * 86400000, coverId: 'mailchimp-1', screenshots: makeScreens('Mailchimp', 5) },
  { id: 'headspace', title: 'Headspace', type: 'Mobile', url: 'https://headspace.com', updatedAt: Date.now() - 31 * 86400000, coverId: 'headspace-2', screenshots: makeScreens('Headspace', 6) },
];

function formatUpdated(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
  }
  return `${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'mês' : 'meses'} atrás`;
}

function cloneReference(reference: Reference): Draft {
  return {
    id: reference.id,
    title: reference.title,
    type: reference.type,
    url: reference.url,
    coverId: reference.coverId,
    screenshots: reference.screenshots.map((screen) => ({ ...screen, notes: [...screen.notes] })),
  };
}

function ReferenceVisual({ screen, toneIndex = 0, compact = false }: { screen?: Screenshot; toneIndex?: number; compact?: boolean }) {
  if (screen?.src) {
    return <img src={screen.src} alt={screen.label} className="h-full w-full object-contain" />;
  }
  return (
    <div className={`wireframe-cover ${tones[toneIndex % tones.length]} h-full w-full`} aria-label={screen?.label ?? 'Screenshot de referência'}>
      <div className="wireframe-window">
        <span className="wireframe-sidebar" />
        <span className="wireframe-line wireframe-line-a" />
        <span className="wireframe-line wireframe-line-b" />
        <span className="wireframe-block" />
        {!compact && <span className="wireframe-caption">{screen?.label}</span>}
      </div>
    </div>
  );
}

export default function Home() {
  const [references, setReferences] = useState(initialReferences);
  const [view, setView] = useState<View>('collection');
  const [selectedId, setSelectedId] = useState(initialReferences[0].id);
  const [filter, setFilter] = useState<'Todos' | ReferenceType>('Todos');
  const [sort, setSort] = useState<'recent' | 'old'>('recent');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState('');
  const [activeDraftScreen, setActiveDraftScreen] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [notice, setNotice] = useState('');

  const selectedReference = references.find((reference) => reference.id === selectedId);
  const visibleReferences = useMemo(() => {
    const items = references.filter((reference) => filter === 'Todos' || reference.type === filter);
    return [...items].sort((a, b) => sort === 'recent' ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt);
  }, [references, filter, sort]);
  const dirty = draft ? JSON.stringify(draft) !== draftSnapshot : false;

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView('detail');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const startCreate = () => {
    const empty: Draft = { title: '', type: 'Site', url: '', coverId: '', screenshots: [] };
    setDraft(empty);
    setDraftSnapshot(JSON.stringify(empty));
    setActiveDraftScreen('');
    setErrors({});
    setView('editor');
  };

  const startEdit = () => {
    if (!selectedReference) return;
    const nextDraft = cloneReference(selectedReference);
    setDraft(nextDraft);
    setDraftSnapshot(JSON.stringify(nextDraft));
    setActiveDraftScreen(nextDraft.screenshots[0]?.id ?? '');
    setErrors({});
    setView('editor');
  };

  const requestCancel = () => {
    if (dirty) setConfirm({ kind: 'discard' });
    else finishCancel();
  };

  const finishCancel = () => {
    const target = draft?.id ? 'detail' : 'collection';
    setDraft(null);
    setErrors({});
    setConfirm(null);
    setView(target);
  };

  const validateDraft = () => {
    if (!draft) return false;
    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim()) nextErrors.title = 'Digite um título.';
    if (!draft.screenshots.length) nextErrors.screenshots = 'Adicione pelo menos um screenshot.';
    if (draft.screenshots.some((screen) => screen.notes.some((note) => !note.trim()))) nextErrors.notes = 'Preencha ou remova as observações vazias.';
    if (draft.url.trim()) {
      try { new URL(draft.url.match(/^https?:\/\//) ? draft.url : `https://${draft.url}`); }
      catch { nextErrors.url = 'Confira o endereço informado.'; }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveDraft = () => {
    if (!draft || !validateDraft()) return;
    const normalizedUrl = draft.url.trim() && !/^https?:\/\//.test(draft.url.trim()) ? `https://${draft.url.trim()}` : draft.url.trim();
    if (draft.id) {
      setReferences((items) => items.map((item) => item.id === draft.id ? { ...draft, id: draft.id!, url: normalizedUrl, updatedAt: Date.now() } : item));
      setSelectedId(draft.id);
      showNotice('Alterações salvas.');
    } else {
      const id = uid();
      const created: Reference = { ...draft, id, url: normalizedUrl, updatedAt: Date.now() };
      setReferences((items) => [created, ...items]);
      setSelectedId(id);
      showNotice('Referência criada.');
    }
    setDraft(null);
    setView('detail');
  };

  const deleteReference = () => {
    if (!selectedReference) return;
    setReferences((items) => items.filter((item) => item.id !== selectedReference.id));
    setConfirm(null);
    setView('collection');
    showNotice('Referência excluída.');
  };

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    if (!draft || !files.length) return;
    const available = Math.max(0, 7 - draft.screenshots.length);
    const accepted = files.filter((file) => file.type.startsWith('image/')).slice(0, available);
    if (!accepted.length) {
      setErrors((current) => ({ ...current, screenshots: available === 0 ? 'O limite de 7 screenshots foi atingido.' : 'Selecione arquivos de imagem.' }));
      return;
    }
    Promise.all(accepted.map((file) => new Promise<Screenshot>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: uid(), label: file.name, src: String(reader.result), notes: [] });
      reader.readAsDataURL(file);
    }))).then((screens) => {
      setDraft((current) => {
        if (!current) return current;
        const screenshots = [...current.screenshots, ...screens];
        return { ...current, screenshots, coverId: current.coverId || screens[0].id };
      });
      setActiveDraftScreen((current) => current || screens[0].id);
      setErrors((current) => ({ ...current, screenshots: '' }));
    });
    event.target.value = '';
  };

  const removeScreen = (screenId: string) => {
    if (!draft) return;
    const next = draft.screenshots.filter((screen) => screen.id !== screenId);
    updateDraft('screenshots', next);
    if (draft.coverId === screenId) updateDraft('coverId', next[0]?.id ?? '');
    if (activeDraftScreen === screenId) setActiveDraftScreen(next[0]?.id ?? '');
    setConfirm(null);
  };

  const requestRemoveScreen = (screen: Screenshot) => {
    if (screen.notes.length) setConfirm({ kind: 'remove-screen', screenId: screen.id });
    else removeScreen(screen.id);
  };

  const moveScreen = (screenId: string, direction: -1 | 1) => {
    if (!draft) return;
    const index = draft.screenshots.findIndex((screen) => screen.id === screenId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= draft.screenshots.length) return;
    const next = [...draft.screenshots];
    [next[index], next[target]] = [next[target], next[index]];
    updateDraft('screenshots', next);
  };

  const updateNote = (screenId: string, noteIndex: number, value: string) => {
    if (!draft) return;
    const screens = draft.screenshots.map((screen) => {
      if (screen.id !== screenId) return screen;
      const notes = [...screen.notes];
      notes[noteIndex] = value.slice(0, 300);
      return { ...screen, notes };
    });
    updateDraft('screenshots', screens);
    setErrors((current) => ({ ...current, notes: '' }));
  };

  const addNote = (screenId: string) => {
    if (!draft) return;
    updateDraft('screenshots', draft.screenshots.map((screen) => screen.id === screenId ? { ...screen, notes: [...screen.notes, ''] } : screen));
  };

  const removeNote = (screenId: string, noteIndex: number) => {
    if (!draft) return;
    updateDraft('screenshots', draft.screenshots.map((screen) => screen.id === screenId ? { ...screen, notes: screen.notes.filter((_, index) => index !== noteIndex) } : screen));
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-lg border bg-popover px-4 py-2 text-sm shadow-lg">{notice}</div>}

      {view === 'collection' && (
        <CollectionView references={visibleReferences} total={references.length} filter={filter} sort={sort} onFilter={setFilter} onSort={setSort} onOpen={openDetail} onCreate={startCreate} />
      )}
      {view === 'detail' && selectedReference && (
        <DetailView reference={selectedReference} onBack={() => setView('collection')} onEdit={startEdit} onDelete={() => setConfirm({ kind: 'delete' })} />
      )}
      {view === 'editor' && draft && (
        <EditorView draft={draft} isEditing={Boolean(draft.id)} activeScreen={activeDraftScreen} errors={errors} dirty={dirty} onCancel={requestCancel} onSave={saveDraft} onUpdate={updateDraft} onSelectScreen={setActiveDraftScreen} onFiles={handleFiles} onCover={(id) => updateDraft('coverId', id)} onRemoveScreen={requestRemoveScreen} onMoveScreen={moveScreen} onUpdateNote={updateNote} onAddNote={addNote} onRemoveNote={removeNote} />
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/15 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirm(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-sm rounded-xl border bg-popover p-5 shadow-xl">
            <h2 id="confirm-title" className="font-medium">{confirm.kind === 'delete' ? `Excluir ${selectedReference?.title}?` : confirm.kind === 'discard' ? 'Descartar alterações?' : 'Remover screenshot?'}</h2>
            <p id="confirm-description" className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {confirm.kind === 'delete' && 'A referência, seus screenshots e todas as observações serão excluídos permanentemente.'}
              {confirm.kind === 'discard' && 'Todas as mudanças feitas desde o último salvamento serão perdidas.'}
              {confirm.kind === 'remove-screen' && 'As observações associadas a este screenshot também serão removidas.'}
            </p>
            <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirm(null)}>Cancelar</Button><Button variant={confirm.kind === 'delete' ? 'destructive' : 'default'} onClick={() => { if (confirm.kind === 'delete') deleteReference(); if (confirm.kind === 'discard') finishCancel(); if (confirm.kind === 'remove-screen') removeScreen(confirm.screenId); }}>{confirm.kind === 'delete' ? 'Excluir referência' : confirm.kind === 'discard' ? 'Descartar' : 'Remover'}</Button></div>
          </section>
        </div>
      )}
    </main>
  );
}

function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b bg-background/95 px-5 py-3 backdrop-blur md:px-8">
      <div className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-md border bg-muted"><Grid2X2 className="size-4" /></div><span className="text-sm font-semibold tracking-tight">Interface Library</span></div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

function CollectionView({ references, total, filter, sort, onFilter, onSort, onOpen, onCreate }: { references: Reference[]; total: number; filter: 'Todos' | ReferenceType; sort: 'recent' | 'old'; onFilter: (value: 'Todos' | ReferenceType) => void; onSort: (value: 'recent' | 'old') => void; onOpen: (id: string) => void; onCreate: () => void }) {
  return (
    <>
      <AppHeader><Button onClick={onCreate}><Plus /> Nova referência</Button></AppHeader>
      <section className="mx-auto max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Biblioteca pessoal</p><h1 className="text-3xl font-semibold tracking-[-0.035em]">Referências</h1><p className="mt-2 text-sm text-muted-foreground">{references.length} de {total} referências</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {(['Todos', 'Site', 'Mobile', 'Desktop'] as const).map((item) => <Button key={item} variant={filter === item ? 'default' : 'outline'} onClick={() => onFilter(item)}>{item}</Button>)}
            <NativeSelect className="ml-0 md:ml-2" aria-label="Ordenação" value={sort} onChange={(event) => onSort(event.target.value as 'recent' | 'old')}><NativeSelectOption value="recent">Atualizadas recentemente</NativeSelectOption><NativeSelectOption value="old">Atualizadas há mais tempo</NativeSelectOption></NativeSelect>
          </div>
        </div>
        {references.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {references.map((reference, index) => {
              const cover = reference.screenshots.find((screen) => screen.id === reference.coverId) ?? reference.screenshots[0];
              return <button key={reference.id} type="button" onClick={() => onOpen(reference.id)} className="group overflow-hidden rounded-xl border bg-card text-left transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="aspect-[4/3]"><ReferenceVisual screen={cover} toneIndex={index} compact /></div><div className="flex items-start justify-between gap-3 border-t p-4"><div className="min-w-0"><h2 className="truncate text-sm font-medium">{reference.title}</h2><p className="mt-1 text-xs text-muted-foreground">{reference.type} · {formatUpdated(reference.updatedAt)}</p></div><span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{reference.screenshots.length}</span></div></button>;
            })}
          </div>
        ) : (
          <div className="grid min-h-80 place-items-center rounded-xl border border-dashed text-center"><div><h2 className="font-medium">Nenhuma referência encontrada</h2><p className="mt-2 text-sm text-muted-foreground">Mude o filtro ou registre uma nova referência.</p><Button className="mt-4" variant="outline" onClick={() => onFilter('Todos')}>Visualizar todas</Button></div></div>
        )}
      </section>
    </>
  );
}

function DetailView({ reference, onBack, onEdit, onDelete }: { reference: Reference; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [reference.id]);
  const active = reference.screenshots[index] ?? reference.screenshots[0];
  return (
    <>
      <AppHeader><Button variant="outline" onClick={onEdit}><Pencil /> Editar</Button><Button variant="ghost" size="icon" aria-label="Excluir referência" onClick={onDelete}><Trash2 /></Button></AppHeader>
      <section className="mx-auto max-w-[1440px] px-5 py-6 md:px-8 md:py-8">
        <Button variant="ghost" className="mb-6 -ml-2" onClick={onBack}><ArrowLeft /> Acervo</Button>
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full border px-2 py-1">{reference.type}</span><span>Atualizada {formatUpdated(reference.updatedAt).toLowerCase()}</span></div><h1 className="text-3xl font-semibold tracking-[-0.035em]">{reference.title}</h1>{reference.url && <a href={reference.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">{reference.url.replace(/^https?:\/\//, '')}<ExternalLink className="size-3.5" /></a>}</div><p className="text-sm tabular-nums text-muted-foreground">{index + 1} de {reference.screenshots.length}</p></div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,.65fr)]">
          <div className="min-w-0 rounded-xl border bg-card p-3 md:p-4" role="region" aria-label="Carrossel de screenshots" onKeyDown={(event) => { if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1)); if (event.key === 'ArrowRight') setIndex((current) => Math.min(reference.screenshots.length - 1, current + 1)); }}>
            <div className="aspect-[16/10] overflow-hidden rounded-lg border"><ReferenceVisual screen={active} toneIndex={index} /></div>
            <div className="mt-4 flex items-center justify-between gap-3"><Button variant="outline" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}><ArrowLeft /> Anterior</Button><div className="hidden flex-1 justify-center gap-2 sm:flex">{reference.screenshots.map((screen, screenIndex) => <button key={screen.id} type="button" aria-label={`Abrir screenshot ${screenIndex + 1}`} onClick={() => setIndex(screenIndex)} className={`h-1.5 rounded-full transition-all ${screenIndex === index ? 'w-7 bg-foreground' : 'w-2 bg-border hover:bg-muted-foreground'}`} />)}</div><Button variant="outline" onClick={() => setIndex((current) => Math.min(reference.screenshots.length - 1, current + 1))} disabled={index === reference.screenshots.length - 1}>Próximo <ArrowRight /></Button></div>
          </div>
          <aside className="rounded-xl border bg-card p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-medium">Observações</h2><span className="text-xs text-muted-foreground">Screenshot {index + 1}</span></div>{active?.notes.length ? <ol className="space-y-3">{active.notes.map((note, noteIndex) => <li key={`${active.id}-${noteIndex}`} className="flex gap-3 border-t pt-3 text-sm leading-relaxed first:border-0 first:pt-0"><span className="text-xs text-muted-foreground">{String(noteIndex + 1).padStart(2, '0')}</span><p>{note}</p></li>)}</ol> : <div className="grid min-h-40 place-items-center text-center"><p className="text-sm text-muted-foreground">Nenhuma observação registrada para este screenshot.</p></div>}</aside>
        </div>
      </section>
    </>
  );
}

function EditorView({ draft, isEditing, activeScreen, errors, dirty, onCancel, onSave, onUpdate, onSelectScreen, onFiles, onCover, onRemoveScreen, onMoveScreen, onUpdateNote, onAddNote, onRemoveNote }: { draft: Draft; isEditing: boolean; activeScreen: string; errors: Record<string, string>; dirty: boolean; onCancel: () => void; onSave: () => void; onUpdate: <K extends keyof Draft>(key: K, value: Draft[K]) => void; onSelectScreen: (id: string) => void; onFiles: (event: ChangeEvent<HTMLInputElement>) => void; onCover: (id: string) => void; onRemoveScreen: (screen: Screenshot) => void; onMoveScreen: (id: string, direction: -1 | 1) => void; onUpdateNote: (screenId: string, index: number, value: string) => void; onAddNote: (screenId: string) => void; onRemoveNote: (screenId: string, index: number) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const current = draft.screenshots.find((screen) => screen.id === activeScreen) ?? draft.screenshots[0];
  const currentIndex = draft.screenshots.findIndex((screen) => screen.id === current?.id);
  return (
    <>
      <AppHeader><span className="mr-2 hidden text-xs text-muted-foreground sm:inline">{dirty ? 'Alterações não salvas' : 'Sem alterações'}</span><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={onSave}><Check /> {isEditing ? 'Salvar alterações' : 'Salvar referência'}</Button></AppHeader>
      <section className="mx-auto max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
        <div className="mb-7"><p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{isEditing ? 'Editar referência' : 'Nova referência'}</p><h1 className="text-3xl font-semibold tracking-[-0.035em]">{isEditing ? draft.title : 'Registrar referência'}</h1></div>
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-fit rounded-xl border bg-card p-5 xl:sticky xl:top-24">
            <h2 className="font-medium">Informações básicas</h2>
            <label className="mt-5 block text-sm"><span className="mb-2 block">Título <span className="text-destructive">*</span></span><Input value={draft.title} maxLength={100} aria-invalid={Boolean(errors.title)} onChange={(event) => onUpdate('title', event.target.value)} placeholder="Nome do produto" />{errors.title && <span role="alert" className="mt-1.5 block text-xs text-destructive">{errors.title}</span>}</label>
            <label className="mt-4 block text-sm"><span className="mb-2 block">Tipo <span className="text-destructive">*</span></span><NativeSelect className="w-full" value={draft.type} onChange={(event) => onUpdate('type', event.target.value as ReferenceType)}><NativeSelectOption value="Site">Site</NativeSelectOption><NativeSelectOption value="Mobile">Aplicativo mobile</NativeSelectOption><NativeSelectOption value="Desktop">Aplicativo desktop</NativeSelectOption></NativeSelect></label>
            <label className="mt-4 block text-sm"><span className="mb-2 block">URL</span><Input value={draft.url} aria-invalid={Boolean(errors.url)} onChange={(event) => onUpdate('url', event.target.value)} placeholder="produto.com" />{errors.url && <span role="alert" className="mt-1.5 block text-xs text-destructive">{errors.url}</span>}</label>
            <div className="mt-6 border-t pt-5"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">Screenshots</span><span className="text-xs text-muted-foreground">{draft.screenshots.length} de 7</span></div><input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} /><Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={draft.screenshots.length >= 7}><ImagePlus /> Adicionar imagens</Button>{errors.screenshots && <span role="alert" className="mt-2 block text-xs text-destructive">{errors.screenshots}</span>}<p className="mt-3 text-xs leading-relaxed text-muted-foreground">Selecione até 7 imagens. A primeira vira capa automaticamente.</p></div>
          </aside>

          <section className="min-w-0 rounded-xl border bg-card p-4 md:p-5">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-medium">Screenshots e observações</h2><p className="mt-1 text-sm text-muted-foreground">Organize a sequência e registre observações independentes.</p></div>{current && <Button variant={draft.coverId === current.id ? 'secondary' : 'outline'} onClick={() => onCover(current.id)} disabled={draft.coverId === current.id}><Star /> {draft.coverId === current.id ? 'Imagem de capa' : 'Definir como capa'}</Button>}</div>
            {draft.screenshots.length ? (
              <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)]">
                <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">{draft.screenshots.map((screen, index) => <button key={screen.id} type="button" onClick={() => onSelectScreen(screen.id)} className={`relative min-w-28 overflow-hidden rounded-lg border text-left lg:block lg:w-full ${screen.id === current?.id ? 'ring-2 ring-foreground/70' : 'hover:border-foreground/30'}`}><div className="aspect-[4/3]"><ReferenceVisual screen={screen} toneIndex={index} compact /></div><div className="flex items-center justify-between border-t bg-background px-2 py-1.5 text-[11px]"><span>{String(index + 1).padStart(2, '0')}</span>{screen.id === draft.coverId && <span>Capa</span>}</div></button>)}</div>
                {current && <div className="min-w-0"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-medium">{current.label}</p><div className="flex items-center gap-1"><Button variant="outline" size="icon-sm" aria-label="Mover para cima" disabled={currentIndex <= 0} onClick={() => onMoveScreen(current.id, -1)}><ArrowUp /></Button><Button variant="outline" size="icon-sm" aria-label="Mover para baixo" disabled={currentIndex >= draft.screenshots.length - 1} onClick={() => onMoveScreen(current.id, 1)}><ArrowDown /></Button><Button variant="destructive" size="icon-sm" aria-label="Remover screenshot" onClick={() => onRemoveScreen(current)}><Trash2 /></Button></div></div><div className="aspect-[16/9] overflow-hidden rounded-lg border"><ReferenceVisual screen={current} toneIndex={currentIndex} /></div><div className="mt-5 flex items-center justify-between"><div><h3 className="text-sm font-medium">Observações</h3>{errors.notes && <p role="alert" className="mt-1 text-xs text-destructive">{errors.notes}</p>}</div><Button size="sm" variant="outline" onClick={() => onAddNote(current.id)}><Plus /> Adicionar</Button></div><div className="mt-3 space-y-3">{current.notes.map((note, noteIndex) => <div key={`${current.id}-${noteIndex}`} className="rounded-lg border bg-background p-3"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">Observação {noteIndex + 1}</span><Button variant="ghost" size="icon-xs" aria-label="Remover observação" onClick={() => onRemoveNote(current.id, noteIndex)}><X /></Button></div><Textarea value={note} maxLength={300} aria-invalid={!note.trim()} placeholder="Escreva uma observação breve..." onChange={(event) => onUpdateNote(current.id, noteIndex, event.target.value)} /><p className="mt-1.5 text-right text-[11px] tabular-nums text-muted-foreground">{note.length}/300</p></div>)}{!current.notes.length && <button type="button" onClick={() => onAddNote(current.id)} className="grid min-h-28 w-full place-items-center rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/40"><span>+ Adicionar primeira observação</span></button>}</div></div>}
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="grid min-h-[430px] w-full place-items-center rounded-xl border border-dashed text-center hover:bg-muted/30"><div><ImagePlus className="mx-auto size-7 text-muted-foreground" /><h3 className="mt-4 font-medium">Adicione seus screenshots</h3><p className="mt-2 max-w-sm text-sm text-muted-foreground">Selecione de 1 a 7 imagens para começar a organizar e anotar a referência.</p></div></button>
            )}
          </section>
        </div>
      </section>
    </>
  );
}
