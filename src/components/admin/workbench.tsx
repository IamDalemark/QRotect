/* eslint-disable @next/next/no-img-element -- authenticated original map preview */
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { publishItem, restorePublication, uploadMap } from '@/app/admin/content-actions';
import { categoryIds, type Snapshot, type Contact } from '@/lib/directory/schema';
import { itemErrors, type ItemKind, type FieldErrors } from '@/lib/admin/item-validation';
import { categories, areas } from '@/lib/directory/labels';
import { telephoneHref } from '@/lib/directory/calling';

type Props = {
  initial: Snapshot;
  initialRevision: number;
  section: string;
  publishedContacts: Contact[];
  history: { id: string; created_at: string; current: boolean }[];
  events: { id: number; action: string; revision: number | null; created_at: string }[];
};
const Fields = createContext<{ errors: FieldErrors; touch: (name: string) => void }>({
  errors: {},
  touch: () => {},
});
function Field({
  name,
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = 'text',
  options,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: string;
  options?: { value: string; label: string }[];
}) {
  const id = useId();
  const { errors, touch } = useContext(Fields);
  const error = errors[name];
  const common = {
    id,
    name,
    value,
    'aria-invalid': Boolean(error),
    'aria-describedby':
      [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined,
    onBlur: (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!(event.relatedTarget instanceof HTMLButtonElement)) touch(name);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(e.target.value),
  };
  return (
    <div className="admin-field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {options ? (
        <select {...common}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={type}
          placeholder={placeholder}
          inputMode={type === 'tel' ? 'tel' : undefined}
        />
      )}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
function Check({
  name,
  label,
  checked,
  onChange,
  hint,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  const { errors, touch } = useContext(Fields);
  const error = errors[name];
  return (
    <div className="admin-field">
      <label className="checkbox-label" htmlFor={id}>
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onBlur={(event) => {
            if (!(event.relatedTarget instanceof HTMLButtonElement)) touch(name);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') ||
            undefined
          }
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
function Bilingual({
  name,
  label,
  value,
  onChange,
  hint,
}: {
  name: string;
  label: string;
  value: { en: string; hil: string };
  onChange: (language: 'en' | 'hil', text: string) => void;
  hint?: string;
}) {
  return (
    <fieldset className="bilingual-fields">
      <legend>{label}</legend>
      {hint && <p className="field-hint">{hint}</p>}
      <Field
        name={`${name}.en`}
        label="English"
        value={value.en}
        onChange={(text) => onChange('en', text)}
        placeholder="Enter the English text"
      />
      <Field
        name={`${name}.hil`}
        label="Hiligaynon"
        value={value.hil}
        onChange={(text) => onChange('hil', text)}
        placeholder="Enter the reviewed Hiligaynon text"
      />
    </fieldset>
  );
}
const titles: Record<string, string> = {
  overview: 'Directory overview',
  contacts: 'Manage contacts',
  'quick-calls': 'Home quick calls',
  guidance: 'Guidance',
  map: 'Campus evacuation map',
  history: 'Publication history',
};
const blank = { en: '', hil: '' };
export function Workbench({
  initial,
  initialRevision,
  section,
  history,
  events,
  publishedContacts = [],
}: Props) {
  const router = useRouter();
  const [working, setWorking] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [revision, setRevision] = useState(initialRevision);
  const [received, setReceived] = useState(initialRevision);
  const [selected, setSelected] = useState(
    section === 'guidance'
      ? initial.guidance[0]?.id || ''
      : section === 'quick-calls'
        ? 'police'
        : initial.contacts[0]?.id || '',
  );
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [aliasText, setAliasText] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [touched, setTouched] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  if (received !== initialRevision) {
    setReceived(initialRevision);
    setRevision(initialRevision);
    setWorking(initial);
    setBaseline(initial);
    setAliasText({});
    setDirty(false);
  }
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const navigate = (e: MouseEvent) => {
      const a = (e.target as Element).closest('a');
      if (a && a.target !== '_blank' && !window.confirm('Leave without publishing your changes?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);
  function edit(change: (d: Snapshot) => void) {
    setWorking((previous) => {
      const d = structuredClone(previous);
      change(d);
      return d;
    });
    setDirty(true);
    setServerErrors({});
    setMessage('Unpublished changes.');
  }
  function select(id: string) {
    if (dirty && !window.confirm('Discard unpublished changes to this item?')) return;
    setWorking(baseline);
    setAliasText({});
    setSelected(id);
    setDirty(false);
    setTouched([]);
    setSubmitted(false);
    setServerErrors({});
    setMessage('');
  }
  const contact = working.contacts.find((c) => c.id === selected);
  const ci = working.contacts.findIndex((c) => c.id === selected);
  const guide = working.guidance.find((g) => g.id === selected);
  const gi = working.guidance.findIndex((g) => g.id === selected);
  const assignment = working.quickCalls?.find((q) => q.category === selected) ?? null;
  const kind: ItemKind =
    section === 'contacts'
      ? 'contact'
      : section === 'guidance'
        ? 'guidance'
        : section === 'quick-calls'
          ? 'quick-call'
          : 'map';
  const item =
    kind === 'contact'
      ? (contact ?? null)
      : kind === 'guidance'
        ? (guide ?? null)
        : kind === 'quick-call'
          ? assignment
          : working.map;
  const validation = itemErrors(kind, item);
  const errors = {
    ...Object.fromEntries(
      Object.entries(validation).filter(([key]) => submitted || touched.includes(key)),
    ),
    ...serverErrors,
  };
  const categoryOptions = categoryIds.map((id) => ({ value: id, label: categories[id].en }));
  function focusError(fields: FieldErrors) {
    const key = Object.keys(fields).find((k) => k !== '_form');
    if (key)
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>(`[name="${CSS.escape(key)}"]`)?.focus(),
      );
  }
  function publish(e?: FormEvent, remove = false) {
    e?.preventDefault();
    const value = remove ? null : item;
    const fields = itemErrors(kind, value);
    setSubmitted(true);
    setServerErrors({});
    if (Object.keys(fields).length) {
      setMessage('Check the highlighted fields. Nothing has been published.');
      focusError(fields);
      return;
    }
    if (
      remove &&
      !window.confirm(
        'Remove this item from the public directory? You can restore a previous publication from History.',
      )
    )
      return;
    start(async () => {
      try {
        const result = await publishItem(
          kind,
          kind === 'map' ? 'campus-map' : selected,
          value,
          revision,
        );
        setMessage(result.message);
        if (result.ok && result.revision != null) {
          setRevision(result.revision);
          setDirty(false);
          setSubmitted(false);
          setTouched([]);
          router.refresh();
        } else {
          setServerErrors(result.errors ?? {});
          focusError(result.errors ?? {});
        }
      } catch {
        setMessage(
          'Publishing could not be confirmed. Reload and check the public directory before retrying.',
        );
      }
    });
  }
  function add(type: 'contact' | 'guidance') {
    if (dirty && !window.confirm('Discard unpublished changes to this item?')) return;
    const id = crypto.randomUUID();
    setWorking(() => {
      const d = structuredClone(baseline);
      if (type === 'contact')
        d.contacts.push({
          id,
          agency: '',
          branch: '',
          category: 'school',
          area: 'cpu',
          description: { ...blank },
          aliases: [],
          hours: '',
          numbers: [
            {
              id: crypto.randomUUID(),
              label: { en: 'Main line', hil: '' },
              display: '',
              dial: '',
              extension: '',
              channel: 'voice',
            },
          ],
          verifiedAt: '',
          source: '',
          approved: false,
          active: true,
          priority: false,
        });
      else
        d.guidance.push({
          id,
          title: { ...blank },
          category: 'school',
          steps: [{ ...blank }],
          source: '',
          reviewer: '',
          reviewedAt: '',
          approved: false,
        });
      return d;
    });
    setSelected(id);
    setDirty(true);
    setSubmitted(false);
    setTouched([]);
    setServerErrors({});
    setMessage('Complete this item, then publish it.');
  }
  function chooseFiles(files: FileList | null) {
    if (pending || !files?.length) return;
    setDragging(false);
    setUploadError('');
    if (files.length !== 1) {
      setUploadError('Choose one map image at a time.');
      return;
    }
    const file = files[0];
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024 ||
      !file.size
    ) {
      setUploadError('Choose a PNG, JPEG or WebP image up to 5 MB.');
      return;
    }
    const data = new FormData();
    data.set('file', file);
    setUploadMessage('Uploading image…');
    start(async () => {
      try {
        const result = await uploadMap(data);
        if (!result.ok || !result.id || !result.assetPath) {
          setUploadError(result.message);
          setUploadMessage('');
          return;
        }
        edit((d) => {
          d.map = {
            id: result.id!,
            assetPath: result.assetPath!,
            description: d.map?.description ?? { ...blank },
            instructions: d.map?.instructions ?? [{ ...blank }],
            source: d.map?.source ?? '',
            reviewer: '',
            reviewedAt: '',
            approved: false,
          };
        });
        setUploadMessage(
          `${file.name} uploaded. Review the description and text below, then publish the map.`,
        );
      } catch {
        setUploadError('Upload failed. Your published map has not changed. Try again.');
        setUploadMessage('');
      } finally {
        if (input.current) input.current.value = '';
      }
    });
  }
  return (
    <>
      <div className="admin-title">
        <div>
          <h1>{titles[section] || 'Administration'}</h1>
          {!['overview', 'history'].includes(section) && (
            <p>Publish one item at a time. Other items stay unchanged.</p>
          )}
        </div>
      </div>
      <p className="admin-status" role="status" aria-live="polite">
        {message}
      </p>
      {section === 'overview' && (
        <>
          <p>
            Choose a section, make your changes, then publish that item. There is no separate save
            or publish-all step.
          </p>
          <dl className="overview-list">
            <dt>Stored contacts</dt>
            <dd>{initial.contacts.length}</dd>
            <dt>Last publication</dt>
            <dd>{history.find((p) => p.current)?.created_at || 'Not published'}</dd>
          </dl>
          <Link href="/admin/contacts" className="button primary">
            Manage contacts
          </Link>
        </>
      )}
      {section === 'history' && (
        <>
          <p>
            Each item update creates a complete version. Restoring a version replaces the whole
            public directory.
          </p>
          {history.map((p) => (
            <article key={p.id} className="history-row">
              <h2>{p.current ? 'Current publication' : 'Previous publication'}</h2>
              <p>{p.created_at}</p>
              <p>{p.id}</p>
              <button
                className="button secondary"
                disabled={pending || p.current}
                onClick={() => {
                  if (
                    !window.confirm(
                      'Restore this entire directory version, including contacts, assignments, guidance and map?',
                    )
                  )
                    return;
                  start(async () => {
                    try {
                      const r = await restorePublication(p.id, revision);
                      setMessage(r.message);
                    } catch {
                      setMessage(
                        'Restore could not be confirmed. Reload and check the public directory.',
                      );
                    }
                  });
                }}
              >
                Restore as new publication
              </button>
            </article>
          ))}
          <h2>Activity</h2>
          {events.map((e) => (
            <p key={e.id}>
              {e.created_at} · {e.action}
            </p>
          ))}
        </>
      )}
      {!['overview', 'history'].includes(section) && (
        <Fields.Provider
          value={{
            errors,
            touch: (name) =>
              setTouched((previous) => (previous.includes(name) ? previous : [...previous, name])),
          }}
        >
          <div
            className={
              ['contacts', 'guidance', 'quick-calls'].includes(section)
                ? 'contact-editor-layout'
                : ''
            }
          >
            {section === 'contacts' && (
              <aside className="draft-list">
                <label>
                  Search contacts
                  <input value={search} onChange={(e) => setSearch(e.target.value)} />
                </label>
                <button
                  className="button secondary"
                  disabled={pending}
                  onClick={() => add('contact')}
                >
                  Add contact
                </button>
                {working.contacts
                  .filter((c) => c.agency.toLowerCase().includes(search.toLowerCase()))
                  .map((c) => (
                    <button
                      key={c.id}
                      className="draft-select"
                      disabled={pending}
                      aria-pressed={selected === c.id}
                      onClick={() => select(c.id)}
                    >
                      {c.agency || 'New contact'}
                      {!c.active ? ' · Hidden' : ''}
                    </button>
                  ))}
              </aside>
            )}
            {section === 'guidance' && (
              <aside className="draft-list">
                <button
                  className="button secondary"
                  disabled={pending}
                  onClick={() => add('guidance')}
                >
                  Add guidance topic
                </button>
                {working.guidance.map((g) => (
                  <button
                    key={g.id}
                    className="draft-select"
                    disabled={pending}
                    aria-pressed={selected === g.id}
                    onClick={() => select(g.id)}
                  >
                    {g.title.en || 'New topic'}
                  </button>
                ))}
              </aside>
            )}
            {section === 'quick-calls' && (
              <aside className="draft-list">
                {categoryIds.map((id) => (
                  <button
                    key={id}
                    className="draft-select"
                    disabled={pending}
                    aria-pressed={selected === id}
                    onClick={() => select(id)}
                  >
                    {categories[id].en}
                  </button>
                ))}
              </aside>
            )}
            <form ref={form} noValidate onSubmit={(e) => publish(e)}>
              <fieldset className="admin-editor-body" disabled={pending}>
                {errors._form && (
                  <div className="field-error" role="alert">
                    {errors._form}
                    {errors._form.includes('Home quick call') && (
                      <p>
                        <Link href="/admin/quick-calls">Open Home quick calls</Link>
                      </p>
                    )}
                  </div>
                )}
                {section === 'contacts' && contact && (
                  <div className="editor-fields">
                    <Field
                      name="agency"
                      label="Agency"
                      value={contact.agency}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].agency = v;
                        })
                      }
                      hint="Official name of the office or service."
                      placeholder="Example: Campus Security Office"
                    />
                    <Field
                      name="branch"
                      label="Branch"
                      value={contact.branch}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].branch = v;
                        })
                      }
                      hint="Location or branch name. Leave blank if there is only one."
                      placeholder="Example: Main campus"
                    />
                    <Field
                      name="category"
                      label="Category"
                      value={contact.category}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].category = v as Contact['category'];
                        })
                      }
                      options={categoryOptions}
                    />
                    <Field
                      name="area"
                      label="Area"
                      value={contact.area}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].area = v as Contact['area'];
                        })
                      }
                      options={Object.entries(areas).map(([value, a]) => ({ value, label: a.en }))}
                    />
                    <Bilingual
                      name="description"
                      label="Description"
                      value={contact.description}
                      onChange={(language, text) =>
                        edit((d) => {
                          d.contacts[ci].description[language] = text;
                        })
                      }
                      hint="Describe what this service handles. Add the same meaning in both languages."
                    />
                    <Field
                      name="aliases"
                      label="Search aliases"
                      value={aliasText[contact.id] ?? contact.aliases.join(', ')}
                      onChange={(v) => {
                        setAliasText((previous) => ({ ...previous, [contact.id]: v }));
                        return;
                        edit((d) => {
                          d.contacts[ci].aliases = v
                            .split(',')
                            .map((a) => a.trim())
                            .filter(Boolean);
                        });
                      }}
                      hint="Optional alternative names, separated by commas."
                      placeholder="Example: security, guard, campus help"
                    />
                    <Field
                      name="hours"
                      label="Service hours"
                      value={contact.hours}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].hours = v;
                        })
                      }
                      hint="Enter only verified hours. Leave blank if unknown."
                      placeholder="Example: Monday–Friday, 8 AM–5 PM"
                    />
                    {contact.numbers.map((n, i) => (
                      <fieldset key={n.id} className="number-editor">
                        <legend>Number {i + 1}</legend>
                        <Bilingual
                          name={`numbers.${i}.label`}
                          label="Line label"
                          value={n.label}
                          onChange={(language, text) =>
                            edit((d) => {
                              d.contacts[ci].numbers[i].label[language] = text;
                            })
                          }
                          hint="Name this line, for example Main line or After-hours line, in both languages."
                        />
                        <Field
                          name={`numbers.${i}.display`}
                          label="Display number"
                          value={n.display}
                          onChange={(v) =>
                            edit((d) => {
                              d.contacts[ci].numbers[i].display = v;
                            })
                          }
                          hint="Readable version shown to visitors. Spaces and parentheses are allowed."
                          placeholder="Example: 0912 345 6789 or (033) 320 1234"
                          type="tel"
                        />
                        <Field
                          name={`numbers.${i}.dial`}
                          label="Phone number to dial"
                          value={n.dial}
                          onChange={(v) =>
                            edit((d) => {
                              d.contacts[ci].numbers[i].dial = v;
                            })
                          }
                          hint="Examples: 09123456789 or +63333201234. Use one number with no spaces, hyphens or extension. Use Add alternate number for another line."
                          placeholder="09123456789 or +63333201234"
                          type="tel"
                        />
                        <Field
                          name={`numbers.${i}.extension`}
                          label="Extension"
                          value={n.extension}
                          onChange={(v) =>
                            edit((d) => {
                              d.contacts[ci].numbers[i].extension = v;
                            })
                          }
                          hint="Optional, up to 8 digits. Leave blank if this line has no extension."
                          placeholder="Example: 123"
                        />
                        <Field
                          name={`numbers.${i}.channel`}
                          label="Channel"
                          value={n.channel}
                          onChange={(v) =>
                            edit((d) => {
                              d.contacts[ci].numbers[i].channel = v as 'voice' | 'text';
                            })
                          }
                          hint="Text-only numbers do not show a voice-call button."
                          options={[
                            { value: 'voice', label: 'Voice' },
                            { value: 'text', label: 'Text only' },
                          ]}
                        />
                        <button
                          type="button"
                          className="button secondary"
                          disabled={contact.numbers.length === 1}
                          onClick={() =>
                            edit((d) => {
                              d.contacts[ci].numbers.splice(i, 1);
                            })
                          }
                        >
                          Remove number {i + 1}
                        </button>
                      </fieldset>
                    ))}
                    <button
                      type="button"
                      className="button secondary"
                      disabled={contact.numbers.length >= 10}
                      onClick={() =>
                        edit((d) => {
                          d.contacts[ci].numbers.push({
                            id: crypto.randomUUID(),
                            label: { en: 'Alternate line', hil: '' },
                            display: '',
                            dial: '',
                            extension: '',
                            channel: 'voice',
                          });
                        })
                      }
                    >
                      Add alternate number
                    </button>
                    <Field
                      name="source"
                      label="Official verification source URL"
                      value={contact.source}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].source = v;
                        })
                      }
                      type="url"
                      hint="Link to the official page where you checked this phone number."
                      placeholder="https://example.edu/contact"
                    />
                    <Field
                      name="verifiedAt"
                      label="Last verified date"
                      value={contact.verifiedAt}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].verifiedAt = v;
                        })
                      }
                      type="date"
                      hint="Date you confirmed the number against its official source."
                    />
                    <Check
                      name="active"
                      label="Show this contact publicly"
                      checked={contact.active}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].active = v;
                        })
                      }
                      hint="Uncheck and publish to hide it. Clear any Home quick-call assignment first."
                    />
                    <Check
                      name="approved"
                      label="I checked this contact and both language versions"
                      checked={contact.approved}
                      onChange={(v) =>
                        edit((d) => {
                          d.contacts[ci].approved = v;
                        })
                      }
                    />
                  </div>
                )}
                {section === 'contacts' && !contact && <p>Add a contact to begin.</p>}
                {section === 'guidance' && guide && (
                  <div className="editor-fields">
                    <p>
                      Enter one guidance topic in English and Hiligaynon. Include its source and the
                      person who checked it. Publishing updates this topic only.
                    </p>
                    <Bilingual
                      name="title"
                      label="Topic title"
                      value={guide.title}
                      onChange={(language, text) =>
                        edit((d) => {
                          d.guidance[gi].title[language] = text;
                        })
                      }
                      hint="A short title that describes the supplied guidance."
                    />
                    <Field
                      name="category"
                      label="Category"
                      value={guide.category}
                      options={categoryOptions}
                      onChange={(v) =>
                        edit((d) => {
                          d.guidance[gi].category = v as Contact['category'];
                        })
                      }
                    />
                    {guide.steps.map((s, i) => (
                      <div key={i}>
                        <Bilingual
                          name={`steps.${i}`}
                          label={`Step ${i + 1}`}
                          value={s}
                          onChange={(language, text) =>
                            edit((d) => {
                              d.guidance[gi].steps[i][language] = text;
                            })
                          }
                          hint="Use the reviewed instructions supplied by the school or official source."
                        />
                        <button
                          type="button"
                          className="button secondary"
                          disabled={guide.steps.length === 1}
                          onClick={() =>
                            edit((d) => {
                              d.guidance[gi].steps.splice(i, 1);
                            })
                          }
                        >
                          Remove step {i + 1}
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="button secondary"
                      disabled={guide.steps.length >= 12}
                      onClick={() =>
                        edit((d) => {
                          d.guidance[gi].steps.push({ ...blank });
                        })
                      }
                    >
                      Add step
                    </button>
                    <Field
                      name="source"
                      label="Source URL"
                      value={guide.source}
                      type="url"
                      onChange={(v) =>
                        edit((d) => {
                          d.guidance[gi].source = v;
                        })
                      }
                      hint="Official webpage or school document link supporting these instructions."
                      placeholder="https://example.edu/safety"
                    />
                    <Field
                      name="reviewer"
                      label="Reviewer"
                      value={guide.reviewer}
                      onChange={(v) =>
                        edit((d) => {
                          d.guidance[gi].reviewer = v;
                        })
                      }
                      hint="Name of the person who checked the instructions and both translations."
                      placeholder="Reviewer’s full name"
                    />
                    <Field
                      name="reviewedAt"
                      label="Review date"
                      value={guide.reviewedAt}
                      type="date"
                      onChange={(v) =>
                        edit((d) => {
                          d.guidance[gi].reviewedAt = v;
                        })
                      }
                      hint="Date the reviewer approved this topic."
                    />
                    <Check
                      name="approved"
                      label="The reviewer approved this topic and both language versions"
                      checked={guide.approved}
                      onChange={(v) =>
                        edit((d) => {
                          d.guidance[gi].approved = v;
                        })
                      }
                    />
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => publish(undefined, true)}
                    >
                      Remove guidance
                    </button>
                  </div>
                )}
                {section === 'guidance' && !guide && <p>Add a guidance topic to begin.</p>}
                {section === 'quick-calls' && (
                  <div className="editor-fields">
                    <h2>{categories[selected as Contact['category']]?.en}</h2>
                    <p>
                      Choose a published contact and its exact voice line. Publishing changes this
                      category’s Home call button only. Clear the selection to offer contact
                      browsing instead.
                    </p>
                    <Field
                      name="assignment"
                      label="Call destination"
                      value={assignment ? `${assignment.contactId}:${assignment.numberId}` : ''}
                      onChange={(v) =>
                        edit((d) => {
                          d.quickCalls = (d.quickCalls ?? []).filter(
                            (q) => q.category !== selected,
                          );
                          if (v) {
                            const [contactId, numberId] = v.split(':');
                            d.quickCalls.push({
                              category: selected as Contact['category'],
                              contactId,
                              numberId,
                            });
                          }
                        })
                      }
                      options={[
                        { value: '', label: 'No quick call — browse contacts' },
                        ...publishedContacts
                          .filter((c) => c.active && c.category === selected)
                          .flatMap((c) =>
                            c.numbers
                              .filter((n) => telephoneHref(n))
                              .map((n) => ({
                                value: `${c.id}:${n.id}`,
                                label: `${c.agency}${c.branch ? ' / ' + c.branch : ''} — ${n.label.en} — ${n.display}${n.extension ? ' ext. ' + n.extension : ''}`,
                              })),
                          ),
                      ]}
                    />
                  </div>
                )}
                {section === 'map' && (
                  <div className="editor-fields">
                    <p>
                      Upload one campus map, then describe it and provide its text instructions in
                      both languages. Uploading alone does not replace the public map.
                    </p>
                    <div
                      className={`map-dropzone${dragging ? ' is-dragging' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!pending) setDragging(true);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        chooseFiles(e.dataTransfer.files);
                      }}
                    >
                      <input
                        ref={input}
                        hidden
                        type="file"
                        aria-label="Choose map image"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => chooseFiles(e.target.files)}
                      />
                      <p>Drag and drop a map image here</p>
                      <p className="field-hint">PNG, JPEG or WebP · one image · maximum 5 MB</p>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => input.current?.click()}
                      >
                        Choose image
                      </button>
                    </div>
                    {uploadMessage && <p>{uploadMessage}</p>}
                    {uploadError && (
                      <p className="field-error" role="alert">
                        {uploadError}
                      </p>
                    )}
                    {working.map && (
                      <>
                        <img
                          className="admin-map-preview"
                          alt="Private uploaded campus map preview"
                          src={`/api/admin/map?path=${encodeURIComponent(working.map.assetPath)}`}
                        />
                        <Bilingual
                          name="description"
                          label="Map description / alternative text"
                          value={working.map.description}
                          onChange={(language, text) =>
                            edit((d) => {
                              d.map!.description[language] = text;
                            })
                          }
                          hint="Describe the map so someone who cannot see it understands what it shows."
                        />
                        {working.map.instructions.map((s, i) => (
                          <div key={i}>
                            <Bilingual
                              name={`instructions.${i}`}
                              label={`Text instruction ${i + 1}`}
                              value={s}
                              onChange={(language, text) =>
                                edit((d) => {
                                  d.map!.instructions[i][language] = text;
                                })
                              }
                              hint="Provide the school-supplied map directions in both languages."
                            />
                            <button
                              type="button"
                              className="button secondary"
                              disabled={working.map!.instructions.length === 1}
                              onClick={() =>
                                edit((d) => {
                                  d.map!.instructions.splice(i, 1);
                                })
                              }
                            >
                              Remove instruction {i + 1}
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="button secondary"
                          disabled={working.map.instructions.length >= 20}
                          onClick={() =>
                            edit((d) => {
                              d.map!.instructions.push({ ...blank });
                            })
                          }
                        >
                          Add text instruction
                        </button>
                        <Field
                          name="source"
                          label="Source URL"
                          value={working.map.source}
                          type="url"
                          onChange={(v) =>
                            edit((d) => {
                              d.map!.source = v;
                            })
                          }
                          hint="School webpage or document link that supplies this map."
                          placeholder="https://example.edu/campus-map"
                        />
                        <Field
                          name="reviewer"
                          label="Reviewer"
                          value={working.map.reviewer}
                          onChange={(v) =>
                            edit((d) => {
                              d.map!.reviewer = v;
                            })
                          }
                          hint="Name of the person who checked this map and its text in both languages."
                          placeholder="Reviewer’s full name"
                        />
                        <Field
                          name="reviewedAt"
                          label="Review date"
                          value={working.map.reviewedAt}
                          type="date"
                          onChange={(v) =>
                            edit((d) => {
                              d.map!.reviewedAt = v;
                            })
                          }
                          hint="Date this map and its text were approved."
                        />
                        <Check
                          name="approved"
                          label="The reviewer approved this map and both text versions"
                          checked={working.map.approved}
                          onChange={(v) =>
                            edit((d) => {
                              d.map!.approved = v;
                            })
                          }
                        />
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => publish(undefined, true)}
                        >
                          Remove map
                        </button>
                      </>
                    )}
                  </div>
                )}
                {(item !== null || section === 'quick-calls') && (
                  <div className="editor-actions">
                    {dirty && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => select(selected)}
                      >
                        Discard changes
                      </button>
                    )}
                    <button className="button primary" type="submit">
                      {pending
                        ? 'Working…'
                        : {
                            contact: 'Publish contact',
                            guidance: 'Publish guidance',
                            map: 'Publish map',
                            'quick-call': 'Publish assignment',
                          }[kind]}
                    </button>
                    <p className="field-hint">
                      Only this {kind === 'quick-call' ? 'assignment' : kind} will change publicly.
                    </p>
                  </div>
                )}
              </fieldset>
            </form>
          </div>
        </Fields.Provider>
      )}
    </>
  );
}
