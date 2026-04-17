'use client';

import { useLanguage } from '@/context/LanguageContext';
import { Navbar } from '@/components/layout';
import { Card, Badge } from '@/components/ui';

const roundData = [
  {
    key: 1,
    titleKey: 'rules.round1Rules',
    textKey: 'rules.round1Text',
    border: 'border-l-[#27ae60]',
    icon: '🗣',
    timer: 45,
    skips: 3,
  },
  {
    key: 2,
    titleKey: 'rules.round2Rules',
    textKey: 'rules.round2Text',
    border: 'border-l-[#f5a623]',
    icon: '☝',
    timer: 35,
    skips: 1,
  },
  {
    key: 3,
    titleKey: 'rules.round3Rules',
    textKey: 'rules.round3Text',
    border: 'border-l-[#e74c3c]',
    icon: '🎭',
    timer: 30,
    skips: 0,
  },
];

export default function RulesPage() {
  const { language, setLanguage, t, dir } = useLanguage();
  const toggleLanguage = () => setLanguage(language === 'en' ? 'fa' : 'en');

  return (
    <>
      <Navbar language={language} onLanguageToggle={toggleLanguage} />

      <main className="flex-1 px-4 py-8" dir={dir}>
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <h1 className="text-3xl font-bold text-[#f5a623] text-center glow-gold">
            {t('rules.title')}
          </h1>

          {/* Overview */}
          <Card variant="outlined" padding="md">
            <h2 className="text-lg font-semibold text-[#f0e6d3] mb-2">{t('rules.overview')}</h2>
            <p className="text-[#a89b8c] leading-relaxed">{t('rules.overviewText')}</p>
          </Card>

          {/* Setup */}
          <Card variant="outlined" padding="md">
            <h2 className="text-lg font-semibold text-[#f0e6d3] mb-2">{t('rules.setup')}</h2>
            <p className="text-[#a89b8c] leading-relaxed">{t('rules.setupText')}</p>
          </Card>

          {/* Rounds */}
          {roundData.map((round) => (
            <Card
              key={round.key}
              variant="outlined"
              padding="md"
              className={`border-l-4 ${round.border}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">{round.icon}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="text-lg font-semibold text-[#f0e6d3]">
                      {t(round.titleKey)}
                    </h2>
                    <Badge variant="info" size="sm">{round.timer}s</Badge>
                    <Badge variant={round.skips === 0 ? 'error' : 'warning'} size="sm">
                      {round.skips} {t('create.skips').toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-[#a89b8c] leading-relaxed">{t(round.textKey)}</p>
                </div>
              </div>
            </Card>
          ))}

          {/* Scoring */}
          <Card variant="outlined" padding="md">
            <h2 className="text-lg font-semibold text-[#f0e6d3] mb-2">{t('rules.scoring')}</h2>
            <p className="text-[#a89b8c] leading-relaxed">{t('rules.scoringText')}</p>
          </Card>
        </div>
      </main>
    </>
  );
}
