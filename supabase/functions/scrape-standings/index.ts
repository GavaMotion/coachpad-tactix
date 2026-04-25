import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';

// ─── MatchTrak ───────────────────────────────────────────────
async function fetchMatchTrak(url: string) {
  const parsedUrl = new URL(url);
  const subdomain = parsedUrl.hostname.split('.')[0];
  const base = `https://${subdomain}.matchtrak.com`;

  const csvEndpoints = [
    `${base}/11/main.nsf/standings-csv-open?openform`,
    `${base}/main.nsf/standings-csv-open?openform`,
    `${base}/standings-csv-open?openform`,
  ];

  for (const csvUrl of csvEndpoints) {
    try {
      console.log('Trying CSV:', csvUrl);
      const res = await fetch(csvUrl, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const text = await res.text();
        console.log('CSV response length:', text.length);
        if (text.length > 50) {
          const parsed = parseMatchTrakCSV(text);
          if (parsed && parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      console.log('CSV endpoint failed:', csvUrl, e.message);
    }
  }

  const htmlEndpoints = [
    `${base}/11/main.nsf/standings-circuit?openview&count=1000&ExpandView`,
    `${base}/main.nsf/standings?openview`,
    url,
  ];

  for (const htmlUrl of htmlEndpoints) {
    try {
      console.log('Trying HTML:', htmlUrl);
      const res = await fetch(htmlUrl, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const html = await res.text();
        console.log('HTML response length:', html.length);
        const parsed = parseHTMLTable(html);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.log('HTML endpoint failed:', htmlUrl, e.message);
    }
  }

  throw new Error('Could not find standings on this MatchTrak page. Try pasting the direct standings URL.');
}

function parseMatchTrakCSV(csv: string) {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
    if (cells.length < 3) continue;
    const row: any = {};
    headers.forEach((h, idx) => {
      const val = cells[idx] || '';
      if (h.includes('team') || h.includes('club') || h.includes('name')) row.team = val;
      else if (h === 'w' || h === 'wins') row.w = parseInt(val) || 0;
      else if (h === 'l' || h === 'losses') row.l = parseInt(val) || 0;
      else if (h === 'd' || h === 't' || h === 'draws' || h === 'ties') row.t = parseInt(val) || 0;
      else if (h === 'gf' || h === 'goals for' || h === 'f') row.gf = parseInt(val) || 0;
      else if (h === 'ga' || h === 'goals against' || h === 'a') row.ga = parseInt(val) || 0;
      else if (h === 'pts' || h === 'points') row.pts = parseInt(val) || 0;
      else if (h === 'gp' || h === 'played' || h === 'mp') row.gp = parseInt(val) || 0;
    });
    if (row.team) {
      row.gp = row.gp || (row.w + row.l + (row.t || 0));
      row.gd = (row.gf || 0) - (row.ga || 0);
      rows.push(row);
    }
  }
  return rows.length > 0 ? rows : null;
}

// ─── TeamSideline ─────────────────────────────────────────────
async function fetchTeamSideline(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error('Could not fetch TeamSideline page');
  const html = await res.text();
  return parseHTMLTable(html);
}

// ─── Generic HTML Table Parser ────────────────────────────────
function parseHTMLTable(html: string) {
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;

  let bestTable: string[][] = [];
  let tableMatch;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHTML = tableMatch[1];
    const tableRows: string[][] = [];
    let rowMatch;
    const rowRegexLocal = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    while ((rowMatch = rowRegexLocal.exec(tableHTML)) !== null) {
      const cells: string[] = [];
      let cellMatch;
      const cellRegexLocal = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      while ((cellMatch = cellRegexLocal.exec(rowMatch[1])) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim());
      }
      if (cells.length >= 3) tableRows.push(cells);
    }
    if (tableRows.length > bestTable.length) {
      const joined = tableRows.flat().join(' ').toLowerCase();
      if (joined.includes('pts') || joined.includes('points') || joined.includes(' w ') || joined.includes('wins')) {
        bestTable = tableRows;
      }
    }
  }

  if (bestTable.length < 2) return null;

  let headerIdx = 0;
  const colMap: Record<string, number> = {};

  for (let i = 0; i < Math.min(3, bestTable.length); i++) {
    const row = bestTable[i].map(c => c.toLowerCase().trim());
    const hasPts = row.some(c => c === 'pts' || c === 'points' || c === 'pt');
    if (hasPts) {
      headerIdx = i;
      row.forEach((cell, idx) => {
        if (cell === 'w' || cell === 'wins') colMap.w = idx;
        else if (cell === 'l' || cell === 'losses' || cell === 'loss') colMap.l = idx;
        else if (cell === 'd' || cell === 't' || cell === 'ties' || cell === 'draws') colMap.t = idx;
        else if (cell === 'gf' || cell === 'f' || cell === 'goals for') colMap.gf = idx;
        else if (cell === 'ga' || cell === 'a' || cell === 'goals against') colMap.ga = idx;
        else if (cell === 'gd' || cell === 'diff' || cell === 'goal diff') colMap.gd = idx;
        else if (cell === 'pts' || cell === 'points' || cell === 'pt') colMap.pts = idx;
        else if (cell === 'gp' || cell === 'mp' || cell === 'p' || cell === 'played') colMap.gp = idx;
        else if ((cell === 'team' || cell === 'club' || cell === 'name') && colMap.team === undefined) colMap.team = idx;
      });
      if (colMap.team === undefined) colMap.team = 0;
      break;
    }
  }

  const rows: any[] = [];
  for (let i = headerIdx + 1; i < bestTable.length; i++) {
    const row = bestTable[i];
    const teamName = row[colMap.team ?? 0];
    if (!teamName || /^[\d]+$/.test(teamName)) continue;
    const w = parseInt(row[colMap.w ?? -1]) || 0;
    const l = parseInt(row[colMap.l ?? -1]) || 0;
    const t = parseInt(row[colMap.t ?? -1]) || 0;
    const gf = parseInt(row[colMap.gf ?? -1]) || null;
    const ga = parseInt(row[colMap.ga ?? -1]) || null;
    rows.push({
      team: teamName,
      gp: parseInt(row[colMap.gp ?? -1]) || (w + l + t),
      w, l, t,
      gf, ga,
      gd: gf !== null && ga !== null ? gf - ga : parseInt(row[colMap.gd ?? -1]) || null,
      pts: parseInt(row[colMap.pts ?? -1]) || (w * 3 + t),
    });
  }
  return rows.length > 0 ? rows : null;
}

// ─── MatchTrak Division List ──────────────────────────────────
async function fetchMatchTrakDivisions(url: string) {
  const parsedUrl = new URL(url);
  const subdomain = parsedUrl.hostname.split('.')[0];
  const base = `https://${subdomain}.matchtrak.com`;

  const circuitUrl = `${base}/11/main.nsf/standings-circuit?openview&count=1000&ExpandView`;
  const res = await fetch(circuitUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('Could not fetch MatchTrak divisions');
  const html = await res.text();

  const divisionRegex = /RestrictToCategory=([a-z0-9\-]+)/gi;
  const seen = new Set<string>();
  const divisions: { id: string; label: string; url: string }[] = [];

  let match;
  while ((match = divisionRegex.exec(html)) !== null) {
    const categoryId = match[1];
    if (seen.has(categoryId)) continue;
    seen.add(categoryId);

    const parts = categoryId.split('-');
    const divPart = parts[parts.length - 1];
    const gender = divPart.startsWith('b') ? 'Boys' : divPart.startsWith('g') ? 'Girls' : '';
    const age = divPart.replace(/[a-z]/g, '').trim();
    const label = gender && age ? `${gender} U${age}` : divPart.toUpperCase();

    divisions.push({
      id: categoryId,
      label,
      url: `${base}/11/main.nsf/standings-circuit?openview&count=1000&ExpandView&RestrictToCategory=${categoryId}`,
    });
  }

  return divisions.length > 0 ? divisions : null;
}

// ─── Platform Detection ───────────────────────────────────────
function detectPlatform(url: string): string {
  if (url.includes('matchtrak.com')) return 'matchtrak';
  if (url.includes('teamsideline.com')) return 'teamsideline';
  return 'generic';
}

// ─── Main Handler ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url, teamId, save } = await req.json();
    console.log('scrape-standings called with URL:', url);
    const platform = detectPlatform(url);

    if (platform === 'matchtrak') {
      const isHomepage = !url.includes('RestrictToCategory');

      if (isHomepage) {
        const divisions = await fetchMatchTrakDivisions(url);
        if (!divisions || divisions.length === 0) {
          throw new Error('Could not find divisions on this MatchTrak page');
        }
        return new Response(
          JSON.stringify({ divisions, needsDivisionPick: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const standings = await fetchMatchTrak(url);
      if (!standings || standings.length === 0) {
        throw new Error('No standings found for this division');
      }
      if (save && teamId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabase.from('standings').upsert({
          team_id: teamId,
          mode: platform,
          table_data: standings,
          updated_at: new Date().toISOString(),
        });
      }
      return new Response(
        JSON.stringify({ standings, platform }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let standings = null;
    if (platform === 'teamsideline') {
      standings = await fetchTeamSideline(url);
    } else {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('Could not fetch page');
      const html = await res.text();
      standings = parseHTMLTable(html);
    }

    if (!standings || standings.length === 0) {
      throw new Error('No standings table found. Try switching to manual entry.');
    }

    if (save && teamId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabase.from('standings').upsert({
        team_id: teamId,
        mode: platform,
        table_data: standings,
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ standings, platform }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('scrape-standings error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
