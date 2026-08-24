import type { DeepSaveDetails } from '../../../types'

export function SkillsTab({ details }: { details: DeepSaveDetails }) {
  const learned = details.skills.filter((skill) => skill.learned)
  const other = details.skills.filter((skill) => !skill.learned)
  const byCategory = new Map<string, typeof learned>()
  for (const skill of learned) {
    const list = byCategory.get(skill.category) || []
    list.push(skill)
    byCategory.set(skill.category, list)
  }

  return (
    <div className="deep-tab-panel">
      <section className="drawer-section deep-section">
        <div className="section-heading">
          <div><p className="eyebrow">TRENING</p><h3>Umiejętności</h3></div>
          <span className="success-pill">{learned.length} aktywnych</span>
        </div>
        {[...byCategory.entries()].map(([category, skills]) => (
          <div key={category} className="skill-category-group">
            <p className="skill-category-group__label">{category}</p>
            <div className="skill-list skill-list--learned">
              {skills.map((skill) => (
                <div key={skill.id}><span><b>{skill.label}</b></span><strong>{skill.level}</strong></div>
              ))}
            </div>
          </div>
        ))}
        {!learned.length && <div className="inline-empty">Brak wyuczonych umiejętności</div>}
        <details className="unlearned-skills">
          <summary>Pokaż niewyuczone ({other.length})</summary>
          <div className="skill-list">
            {other.map((skill) => (
              <div key={skill.id}><span><b>{skill.label}</b><small>{skill.category}</small></span><strong>{skill.level}</strong></div>
            ))}
          </div>
        </details>
      </section>
    </div>
  )
}
