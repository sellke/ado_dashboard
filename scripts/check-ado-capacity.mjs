import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const m = env.match(new RegExp(`${key}="?([^"\\n]+)"?`));
  return m ? m[1].trim() : null;
};

const org = getEnv('ADO_ORG');
const pat = getEnv('ADO_PAT');
const auth = Buffer.from(`:${pat}`).toString('base64');
const project = 'Event Streaming Platform';

const teams = {
  Streams: 'ae8bcdaa-d61b-475c-ba34-13c88b1adf8e',
  'Action Tracker': '69fee166-1ccb-43b5-afcd-5d3f08fa2198',
};

async function getCapacity(teamId, iterationId, iterName) {
  const url = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations/${iterationId}/capacities?api-version=7.0`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  const viaValue = data.value;
  const viaTeamMembers = data.teamMembers;
  console.log(`  [${iterName}] value=${JSON.stringify(viaValue)?.slice(0,30)}, teamMembers.len=${viaTeamMembers?.length ?? 'N/A'}, totalCapPerDay=${data.totalCapacityPerDay}`);
  if (viaTeamMembers && viaTeamMembers.length > 0) {
    viaTeamMembers.slice(0, 2).forEach((m) =>
      console.log(`    member: ${m.teamMember?.displayName} activities=${JSON.stringify(m.activities)}`)
    );
  }
}

async function main() {
  for (const [teamName, teamId] of Object.entries(teams)) {
    const iterUrl = `https://dev.azure.com/${org}/${encodeURIComponent(project)}/${encodeURIComponent(teamId)}/_apis/work/teamsettings/iterations?api-version=7.0&$top=25`;
    const iterRes = await fetch(iterUrl, {
      headers: { Accept: 'application/json', Authorization: `Basic ${auth}` },
    });
    const iterData = await iterRes.json();
    const iters = iterData.value ?? [];
    // Get 3 most recent
    const recent = iters.slice(-3);
    console.log(`\n=== ${teamName} (last 3 sprints) ===`);
    for (const it of recent) {
      await getCapacity(teamId, it.id, it.name);
    }
  }
}

main().catch(console.error);
