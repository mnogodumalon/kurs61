import { useEffect, useState } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Kurse, Anmeldungen } from '@/types/app';
import {
  GraduationCap,
  Users,
  DoorOpen,
  BookOpen,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  Clock,
  Euro,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Stats {
  dozenten: number;
  teilnehmer: number;
  raeume: number;
  kurse: number;
  anmeldungen: number;
  bezahlt: number;
  unbezahlt: number;
  umsatz: number;
  upcomingKurse: Kurse[];
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [dozentenData, teilnehmerData, raeumeData, kurseData, anmeldungenData] = await Promise.all([
          LivingAppsService.getDozenten(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
        ]);

        const bezahlt = anmeldungenData.filter((a: Anmeldungen) => a.fields.bezahlt === true).length;
        const unbezahlt = anmeldungenData.filter((a: Anmeldungen) => !a.fields.bezahlt).length;

        // Calculate revenue from paid registrations × course price
        let umsatz = 0;
        for (const anm of anmeldungenData as Anmeldungen[]) {
          if (anm.fields.bezahlt) {
            const kursUrl = anm.fields.kurs;
            if (kursUrl) {
              const kursId = kursUrl.split('/').pop();
              const kurs = (kurseData as Kurse[]).find(k => k.record_id === kursId);
              if (kurs?.fields.preis) {
                umsatz += kurs.fields.preis;
              }
            }
          }
        }

        const today = new Date().toISOString().split('T')[0];
        const upcomingKurse = (kurseData as Kurse[])
          .filter(k => k.fields.startdatum && k.fields.startdatum >= today)
          .sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''))
          .slice(0, 5);

        setStats({
          dozenten: dozentenData.length,
          teilnehmer: teilnehmerData.length,
          raeume: raeumeData.length,
          kurse: kurseData.length,
          anmeldungen: anmeldungenData.length,
          bezahlt,
          unbezahlt,
          umsatz,
          upcomingKurse,
        });
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const kpiCards = [
    { label: 'Dozenten', value: stats?.dozenten ?? 0, icon: GraduationCap, colorClass: 'stat-card-1' },
    { label: 'Teilnehmer', value: stats?.teilnehmer ?? 0, icon: Users, colorClass: 'stat-card-2' },
    { label: 'Räume', value: stats?.raeume ?? 0, icon: DoorOpen, colorClass: 'stat-card-3' },
    { label: 'Kurse', value: stats?.kurse ?? 0, icon: BookOpen, colorClass: 'stat-card-4' },
    { label: 'Anmeldungen', value: stats?.anmeldungen ?? 0, icon: ClipboardList, colorClass: 'stat-card-5' },
  ];

  const paymentData = stats
    ? [
        { name: 'Bezahlt', value: stats.bezahlt },
        { name: 'Ausstehend', value: stats.unbezahlt },
      ]
    : [];
  const PIE_COLORS = ['oklch(0.42 0.18 264)', 'oklch(0.88 0.08 264)'];

  const barData = stats
    ? [
        { name: 'Dozenten', count: stats.dozenten },
        { name: 'Teilnehmer', count: stats.teilnehmer },
        { name: 'Räume', count: stats.raeume },
        { name: 'Kurse', count: stats.kurse },
        { name: 'Anmeldungen', count: stats.anmeldungen },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="hero-gradient rounded-2xl p-8 text-white relative overflow-hidden" style={{ boxShadow: 'var(--shadow-hero)' }}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 20%, oklch(0.9 0 0) 0%, transparent 60%)',
          }}
        />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest opacity-70 mb-1">
              Kursverwaltungssystem
            </p>
            <h1 className="text-4xl font-800 leading-tight mb-2" style={{ fontWeight: 800 }}>
              Guten Tag!
            </h1>
            <p className="text-base opacity-80 max-w-md">
              Hier sehen Sie Ihre aktuelle Übersicht — Kurse, Teilnehmer, Dozenten und Buchungsstand auf einen Blick.
            </p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <div className="bg-white/15 rounded-xl px-5 py-3 flex items-center gap-3">
              <Euro size={18} className="opacity-80" />
              <div>
                <p className="text-xs opacity-70">Umsatz (bezahlt)</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : `${(stats?.umsatz ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`}
                </p>
              </div>
            </div>
            <div className="bg-white/15 rounded-xl px-5 py-3 flex items-center gap-3">
              <TrendingUp size={18} className="opacity-80" />
              <div>
                <p className="text-xs opacity-70">Bezahlquote</p>
                <p className="text-2xl font-bold">
                  {loading || !stats || stats.anmeldungen === 0
                    ? '—'
                    : `${Math.round((stats.bezahlt / stats.anmeldungen) * 100)} %`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, colorClass }) => (
          <div
            key={label}
            className={`${colorClass} rounded-2xl p-5 flex flex-col gap-3 card-shadow`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-60">{label}</p>
              <div className="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center">
                <Icon size={15} />
              </div>
            </div>
            <p className="text-4xl font-extrabold" style={{ fontWeight: 800 }}>
              {loading ? '…' : value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border p-6 card-shadow">
          <h2 className="text-base font-bold mb-4">Datensätze im Überblick</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.012 260)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', fill: 'oklch(0.52 0.03 264)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', fill: 'oklch(0.52 0.03 264)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'oklch(0.95 0.015 264)' }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid oklch(0.9 0.012 260)',
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="count" name="Anzahl" fill="oklch(0.42 0.18 264)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart — Payment status */}
        <div className="bg-card rounded-2xl border p-6 card-shadow flex flex-col">
          <h2 className="text-base font-bold mb-4">Zahlungsstatus</h2>
          {!loading && stats && stats.anmeldungen > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid oklch(0.9 0.012 260)',
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-auto flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-primary" />
                    <span className="text-sm font-medium">Bezahlt</span>
                  </div>
                  <span className="text-sm font-bold">{stats.bezahlt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Ausstehend</span>
                  </div>
                  <span className="text-sm font-bold text-muted-foreground">{stats.unbezahlt}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? 'Lade Daten…' : 'Keine Anmeldungen vorhanden'}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Courses */}
      <div className="bg-card rounded-2xl border p-6 card-shadow">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen size={15} className="text-primary" />
          </div>
          <h2 className="text-base font-bold">Bevorstehende Kurse</h2>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm">Lade Daten…</p>
        ) : stats?.upcomingKurse.length === 0 ? (
          <p className="text-muted-foreground text-sm">Keine bevorstehenden Kurse eingetragen.</p>
        ) : (
          <div className="space-y-3">
            {stats!.upcomingKurse.map((kurs) => (
              <div
                key={kurs.record_id}
                className="flex items-center justify-between py-3 px-4 rounded-xl bg-accent/40 hover:bg-accent/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{kurs.fields.titel}</p>
                    {kurs.fields.beschreibung && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{kurs.fields.beschreibung}</p>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs font-semibold text-primary">
                    {kurs.fields.startdatum
                      ? format(new Date(kurs.fields.startdatum), 'dd. MMM yyyy', { locale: de })
                      : '—'}
                  </p>
                  {kurs.fields.preis != null && (
                    <p className="text-xs text-muted-foreground">{kurs.fields.preis.toFixed(2)} €</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
