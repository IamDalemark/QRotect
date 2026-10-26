'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import {
  saveDraft,
  publishDraft,
  restorePublication,
  uploadMap,
} from '@/app/admin/content-actions';
import { categoryIds, publicationIssues, type Snapshot } from '@/lib/directory/schema';
import { categories, areas } from '@/lib/directory/labels';
type Props = {
  initial: Snapshot;
  initialRevision: number;
  section: string;
  history: { id: string; created_at: string; current: boolean }[];
  events: { id: number; action: string; revision: number | null; created_at: string }[];
};
function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Bilingual({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { en: string; hil: string };
  onChange: (value: { en: string; hil: string }) => void;
}) {
  return (
    <fieldset className="bilingual-fields">
      <legend>{label}</legend>
      <Field label="English" value={value.en} onChange={(en) => onChange({ ...value, en })} />
      <Field label="Hiligaynon" value={value.hil} onChange={(hil) => onChange({ ...value, hil })} />
    </fieldset>
  );
}
export function Workbench({ initial, initialRevision, section, history, events }: Props) {
  const [draft, setDraft] = useState(initial);
  const [revision, setRevision] = useState(initialRevision);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(initial.contacts[0]?.id || '');
  const [search, setSearch] = useState('');
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest('a');
      if (
        anchor &&
        anchor.target !== '_blank' &&
        !window.confirm('Leave without saving draft changes?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);
  function edit(change: (value: Snapshot) => void) {
    setDraft((previous) => {
      const next = structuredClone(previous);
      change(next);
      return next;
    });
    setDirty(true);
    setMessage('Unsaved draft changes.');
  }
  function run(action: () => Promise<{ ok: boolean; message: string; revision?: number | null }>) {
    start(async () => {
      try {
        const result = await action();
        setMessage(result.message);
        if (result.ok && result.revision != null) {
          setRevision(result.revision);
          setDirty(false);
        }
      } catch {
        setMessage('The action could not be completed. Reconnect or sign in again, then retry.');
      }
    });
  }
  const contact = draft.contacts.find((c) => c.id === selected);
  const ci = draft.contacts.findIndex((c) => c.id === selected);
  const issues = publicationIssues(draft);
  function addContact() {
    const id = crypto.randomUUID();
    edit((d) =>
      d.contacts.push({
        id,
        agency: '',
        branch: '',
        category: 'school',
        area: 'cpu',
        description: { en: '', hil: '' },
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
      }),
    );
    setSelected(id);
  }
  const blank = { en: '', hil: '' };
  return (
    <>
      <div className="admin-title">
        <div>
          <h1>
            {
              (
                {
                  overview: 'Directory overview',
                  contacts: 'Manage contacts',
                  guidance: 'Approved guidance',
                  map: 'Campus evacuation map',
                  publish: 'Preview & publish',
                  history: 'Publication history',
                } as Record<string, string>
              )[section]
            }
          </h1>
          <p>
            Working draft revision {revision} · {dirty ? 'Unsaved changes' : 'Saved draft'}
          </p>
        </div>
        <button
          className="button primary"
          disabled={pending || !dirty}
          onClick={() => run(() => saveDraft(draft, revision))}
        >
          {pending ? 'Working…' : 'Save draft'}
        </button>
      </div>
      <p className="admin-status" role="status">
        {message}
      </p>
      {section === 'overview' && (
        <>
          <p>
            Maintain the working draft, review it in both languages, then publish a complete
            directory. Saving a draft does not change the public website.
          </p>
          <dl className="overview-list">
            <dt>Active draft contacts</dt>
            <dd>{draft.contacts.filter((c) => c.active).length}</dd>
            <dt>Last publication</dt>
            <dd>{history.find((p) => p.current)?.created_at || 'Not published'}</dd>
            <dt>Verification due</dt>
            <dd>
              {
                draft.contacts.filter(
                  (c) =>
                    !c.verifiedAt ||
                    c.verifiedAt <
                      new Date(new Date().setDate(new Date().getDate() - 30))
                        .toISOString()
                        .slice(0, 10),
                ).length
              }{' '}
              contacts
            </dd>
          </dl>
          <Link className="button secondary" href="/admin/contacts">
            Maintain contacts
          </Link>
        </>
      )}
      {section === 'contacts' && (
        <div className="contact-editor-layout">
          <aside className="draft-list">
            <label>
              Search draft contacts
              <input value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button className="button secondary" onClick={addContact}>
              Add contact
            </button>
            {draft.contacts
              .filter((c) => c.agency.toLowerCase().includes(search.toLowerCase()))
              .map((c) => (
                <button
                  key={c.id}
                  className="draft-select"
                  aria-pressed={selected === c.id}
                  onClick={() => setSelected(c.id)}
                >
                  {c.agency || 'New contact'}
                  {!c.active ? ' · Inactive' : ''}
                </button>
              ))}
          </aside>
          {contact && (
            <div className="editor-fields">
              <Field
                label="Agency"
                value={contact.agency}
                onChange={(v) =>
                  edit((d) => {
                    d.contacts[ci].agency = v;
                  })
                }
              />
              <Field
                label="Branch"
                value={contact.branch}
                onChange={(v) =>
                  edit((d) => {
                    d.contacts[ci].branch = v;
                  })
                }
              />
              <label>
                Category
                <select
                  value={contact.category}
                  onChange={(e) =>
                    edit((d) => {
                      d.contacts[ci].category = e.target.value as typeof contact.category;
                    })
                  }
                >
                  {categoryIds.map((id) => (
                    <option key={id} value={id}>
                      {categories[id].en}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Area
                <select
                  value={contact.area}
                  onChange={(e) =>
                    edit((d) => {
                      d.contacts[ci].area = e.target.value as typeof contact.area;
                    })
                  }
                >
                  {Object.entries(areas).map(([id, a]) => (
                    <option key={id} value={id}>
                      {a.en}
                    </option>
                  ))}
                </select>
              </label>
              <Bilingual
                label="Description"
                value={contact.description}
                onChange={(v) =>
                  edit((d) => {
                    d.contacts[ci].description = v;
                  })
                }
              />
              <Field
                label="Search aliases (comma separated)"
                value={contact.aliases.join(', ')}
                onChange={(v) =>
                  edit((d) => {
                    d.contacts[ci].aliases = v
                      .split(',')
                      .map((a) => a.trim())
                      .filter(Boolean);
                  })
                }
              />
              <Field
                label="Verified service hours (leave blank if unknown)"
                value={contact.hours}
                onChange={(v) =>
                  edit((d) => {
                    d.contacts[ci].hours = v;
                  })
                }
              />
              {contact.numbers.map((n, ni) => (
                <fieldset key={n.id} className="number-editor">
                  <legend>Number {ni + 1}</legend>
                  <Bilingual
                    label="Line label"
                    value={n.label}
                    onChange={(v) =>
                      edit((d) => {
                        d.contacts[ci].numbers[ni].label = v;
                      })
                    }
                  />
                  <Field
                    label="Display number"
                    value={n.display}
                    onChange={(v) =>
                      edit((d) => {
                        d.contacts[ci].numbers[ni].display = v;
                      })
                    }
                  />
                  <Field
                    label="Dial value (one number, digits and optional +)"
                    value={n.dial}
                    onChange={(v) =>
                      edit((d) => {
                        d.contacts[ci].numbers[ni].dial = v;
                      })
                    }
                  />
                  <Field
                    label="Extension (separate)"
                    value={n.extension}
                    onChange={(v) =>
                      edit((d) => {
                        d.contacts[ci].numbers[ni].extension = v;
                      })
                    }
                  />
                  <label>
                    Channel
                    <select
                      value={n.channel}
                      onChange={(e) =>
                        edit((d) => {
                          d.contacts[ci].numbers[ni].channel = e.target.value as 'voice' | 'text';
                        })
                      }
                    >
                      <option value="voice">Voice</option>
                      <option value="text">Text only</option>
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    disabled={contact.numbers.length === 1}
                    onClick={() =>
                      edit((d) => {
                        d.contacts[ci].numbers.splice(ni, 1);
                      })
                    }
                  >
                    Remove number
                  </button>
                </fieldset>
              ))}
              <button
                className="button secondary"
                onClick={() =>
                  edit((d) =>
                    d.contacts[ci].numbers.push({
                      id: crypto.randomUUID(),
                      label: { en: 'Alternate line', hil: '' },
                      display: '',
                      dial: '',
                      extension: '',
                      channel: 'voice',
                    }),
                  )
                }
              >
                Add alternate number
              </button>
              <Field
                label="Official verification source URL"
                type="url"
                value={contact.source}
                onChange={(v) =>
                  edit((d) => {
                    d.contacts[ci].source = v;
                  })
                }
              />
              <Field
                label="Last verified date"
                type="date"
                value={contact.verifiedAt}
                onChange={(v) =>
                  edit((d) => {
                    d.contacts[ci].verifiedAt = v;
                  })
                }
              />
              {(['active', 'priority', 'approved'] as const).map((key) => (
                <label className="checkbox-label" key={key}>
                  <input
                    type="checkbox"
                    checked={contact[key]}
                    onChange={(e) =>
                      edit((d) => {
                        d.contacts[ci][key] = e.target.checked;
                      })
                    }
                  />
                  {key === 'approved'
                    ? 'Reviewed contact and both languages are approved'
                    : key === 'priority'
                      ? 'Show in priority contacts'
                      : 'Active contact'}
                </label>
              ))}
            </div>
          )}
          {!contact && (
            <p className="empty-state">
              Add a contact to begin. Unreviewed entries cannot be published.
            </p>
          )}
        </div>
      )}
      {section === 'guidance' && (
        <>
          <p>
            Only school-reviewed guidance with approved English and Hiligaynon content can be
            published.
          </p>
          {draft.guidance.map((g, gi) => (
            <section className="editor-fields guide-editor" key={g.id}>
              <Bilingual
                label="Topic title"
                value={g.title}
                onChange={(v) =>
                  edit((d) => {
                    d.guidance[gi].title = v;
                  })
                }
              />
              <label>
                Related category
                <select
                  value={g.category}
                  onChange={(e) =>
                    edit((d) => {
                      d.guidance[gi].category = e.target.value as typeof g.category;
                    })
                  }
                >
                  {categoryIds.map((id) => (
                    <option key={id} value={id}>
                      {categories[id].en}
                    </option>
                  ))}
                </select>
              </label>
              {g.steps.map((step, si) => (
                <div key={si}>
                  <Bilingual
                    label={`Step ${si + 1}`}
                    value={step}
                    onChange={(v) =>
                      edit((d) => {
                        d.guidance[gi].steps[si] = v;
                      })
                    }
                  />
                  <button
                    className="button secondary"
                    disabled={g.steps.length === 1}
                    onClick={() =>
                      edit((d) => {
                        d.guidance[gi].steps.splice(si, 1);
                      })
                    }
                  >
                    Remove step
                  </button>
                </div>
              ))}
              <button
                className="button secondary"
                onClick={() => edit((d) => d.guidance[gi].steps.push({ ...blank }))}
              >
                Add step
              </button>
              <Field
                label="Source URL"
                value={g.source}
                type="url"
                onChange={(v) =>
                  edit((d) => {
                    d.guidance[gi].source = v;
                  })
                }
              />
              <Field
                label="Reviewer"
                value={g.reviewer}
                onChange={(v) =>
                  edit((d) => {
                    d.guidance[gi].reviewer = v;
                  })
                }
              />
              <Field
                label="Review date"
                value={g.reviewedAt}
                type="date"
                onChange={(v) =>
                  edit((d) => {
                    d.guidance[gi].reviewedAt = v;
                  })
                }
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={g.approved}
                  onChange={(e) =>
                    edit((d) => {
                      d.guidance[gi].approved = e.target.checked;
                    })
                  }
                />
                Content and both translations approved
              </label>
              <button
                className="button secondary"
                onClick={() =>
                  edit((d) => {
                    d.guidance.splice(gi, 1);
                  })
                }
              >
                Remove topic from draft
              </button>
            </section>
          ))}
          <button
            className="button secondary"
            onClick={() =>
              edit((d) =>
                d.guidance.push({
                  id: crypto.randomUUID(),
                  title: { ...blank },
                  category: 'school',
                  steps: [{ ...blank }],
                  source: '',
                  reviewer: '',
                  reviewedAt: '',
                  approved: false,
                }),
              )
            }
          >
            Add guidance topic
          </button>
        </>
      )}
      {section === 'map' && (
        <div className="editor-fields">
          <p>
            Upload the supplied campus map. Add a textual equivalent, sources, and reviewed
            translations.
          </p>
          <label>
            PNG, JPEG or WebP · maximum 5 MB
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const form = new FormData();
                form.set('file', file);
                start(async () => {
                  try {
                    const result = await uploadMap(form);
                    setMessage(result.message);
                    if (result.ok && result.id && result.assetPath)
                      edit((d) => {
                        d.map = {
                          id: result.id!,
                          assetPath: result.assetPath!,
                          description: { ...blank },
                          instructions: [{ ...blank }],
                          source: '',
                          reviewer: '',
                          reviewedAt: '',
                          approved: false,
                        };
                      });
                  } catch {
                    setMessage('Upload failed. Reconnect and try again.');
                  }
                });
              }}
            />
          </label>
          {draft.map && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- authenticated private image preview */}
              <img
                className="admin-map-preview"
                alt="Private uploaded campus map preview"
                src={`/api/admin/map?path=${encodeURIComponent(draft.map.assetPath)}`}
              />
              <Bilingual
                label="Map description / alternative text"
                value={draft.map.description}
                onChange={(v) =>
                  edit((d) => {
                    d.map!.description = v;
                  })
                }
              />
              {draft.map.instructions.map((s, i) => (
                <Bilingual
                  key={i}
                  label={`Text instruction ${i + 1}`}
                  value={s}
                  onChange={(v) =>
                    edit((d) => {
                      d.map!.instructions[i] = v;
                    })
                  }
                />
              ))}
              <button
                className="button secondary"
                onClick={() => edit((d) => d.map!.instructions.push({ ...blank }))}
              >
                Add text instruction
              </button>
              <Field
                label="Source URL"
                value={draft.map.source}
                type="url"
                onChange={(v) =>
                  edit((d) => {
                    d.map!.source = v;
                  })
                }
              />
              <Field
                label="Reviewer"
                value={draft.map.reviewer}
                onChange={(v) =>
                  edit((d) => {
                    d.map!.reviewer = v;
                  })
                }
              />
              <Field
                label="Review date"
                value={draft.map.reviewedAt}
                type="date"
                onChange={(v) =>
                  edit((d) => {
                    d.map!.reviewedAt = v;
                  })
                }
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={draft.map.approved}
                  onChange={(e) =>
                    edit((d) => {
                      d.map!.approved = e.target.checked;
                    })
                  }
                />
                Map and both textual versions are approved
              </label>
              <button
                className="button secondary"
                onClick={() =>
                  edit((d) => {
                    d.map = null;
                  })
                }
              >
                Remove map from draft
              </button>
            </>
          )}
        </div>
      )}
      {section === 'publish' && (
        <>
          <p>
            Save all changes, preview the saved draft using both language options, then publish.
            Publication is atomic; failed publication keeps the current public version.
          </p>
          <Link className="button secondary" href="/admin/preview" target="_blank">
            Preview saved draft ↗
          </Link>
          <h2 className="admin-section-title">Publication checks</h2>
          {issues.length ? (
            <ul className="validation-list">
              {issues.map((i, index) => (
                <li key={index}>{i}</li>
              ))}
            </ul>
          ) : (
            <p>
              Content validation passed. Confirm the supplied records and translations are approved
              before publishing.
            </p>
          )}
          <button
            className="button primary"
            disabled={pending || dirty || issues.length > 0}
            onClick={() => run(() => publishDraft(revision))}
          >
            Publish updates
          </button>
          <h2 className="admin-section-title">Consenting dialer test contact</h2>
          <p>
            This is the only public contact allowed to open the real phone dialer. Record explicit
            consent first.
          </p>
          {draft.testContact ? (
            <div className="editor-fields">
              <Field
                label="Test contact name"
                value={draft.testContact.name}
                onChange={(v) =>
                  edit((d) => {
                    d.testContact!.name = v;
                  })
                }
              />
              <Field
                label="Test phone number"
                value={draft.testContact.dial}
                onChange={(v) =>
                  edit((d) => {
                    d.testContact!.dial = v;
                  })
                }
              />
              <Field
                label="Consent date"
                type="date"
                value={draft.testContact.consentedAt}
                onChange={(v) =>
                  edit((d) => {
                    d.testContact!.consentedAt = v;
                  })
                }
              />
              <button
                className="button secondary"
                onClick={() =>
                  edit((d) => {
                    d.testContact = null;
                  })
                }
              >
                Remove test contact
              </button>
            </div>
          ) : (
            <button
              className="button secondary"
              onClick={() =>
                edit((d) => {
                  d.testContact = { name: '', dial: '', consentedAt: '' };
                })
              }
            >
              Add consenting test contact
            </button>
          )}
        </>
      )}
      {section === 'history' && (
        <>
          <h2>Publications</h2>
          {history.length === 0 && <p>No publication exists yet.</p>}
          {history.map((p) => (
            <article className="history-row" key={p.id}>
              <p>
                <strong>{p.current ? 'Current publication' : 'Previous publication'}</strong>
                <br />
                {p.created_at}
                <br />
                <small>{p.id}</small>
              </p>
              {!p.current && (
                <button
                  className="button secondary"
                  disabled={pending || dirty}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Restore this version as a new publication? This replaces the saved working draft.',
                      )
                    )
                      run(() => restorePublication(p.id, revision));
                  }}
                >
                  Restore as new publication
                </button>
              )}
            </article>
          ))}
          <h2 className="admin-section-title">Recent changes</h2>
          {events.map((e) => (
            <p key={e.id}>
              {e.created_at} · {e.action} · revision {e.revision}
            </p>
          ))}
          <Link className="button secondary" href="/admin/history">
            Reload history
          </Link>
        </>
      )}
    </>
  );
}
