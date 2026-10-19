import subprocess, os, shutil

# Restore clean library.tsx from git object using git show and python open
subprocess.run([
    'git', 'show', 'bf2b3a0:src/app/(tabs)/library.tsx'
], stdout=open('library_tsx_clean.tsx', 'w', encoding='utf-8'), check=True)

with open('library_tsx_clean.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The restructuring: move search/filter block to bottom
# Find the start of the return block's inner content
# We need to insert the search/filter content after SectionList and before the closing </View>

# In the clean file, the SectionList starts with '      <SectionList' and ends with '      />\n    </View>\n  );'
# Let's find the exact end of SectionList: look for the SectionSeparatorComponent line and the /> after it
separator_line = '        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}'
sep_pos = content.find(separator_line)
# Find the closing /> of SectionList: the line after renderItem closing })
# Actually search for the pattern: '        })}\n        SectionSeparatorComponent...\n      />\n    </View>\n  );'
# Let's split at the point where SectionList closes and the search should begin.

# Find the line after SectionList that is just '      />' followed by '    </View>'
section_close_marker = '      />\n    </View>\n  );'
section_close_pos = content.find(section_close_marker)

if section_close_pos == -1:
    # Try alternative: just split before the last '    </View>\n  );'
    section_close_marker = '    </View>\n  );'
    section_close_pos = content.rfind(section_close_marker)

before_main = content[:section_close_pos]
after_close = content[section_close_pos:]

# Find the search block in the clean file: starts with the search View comment
search_start_marker = '      {/* In-list search: filters the hymns below, no separate screen. */}'
search_start = before_main.find(search_start_marker)

# Extract search/filter block: from search_start to the start of SectionList
search_filter_block = before_main[search_start:]

# The SectionList should be in before_main before search_start
# So before_main[:search_start] is everything before search (AppBar + SectionList start?)
# Actually in clean file: AppBar is at top, then search, then filters, then SectionList at bottom? No.
# In clean file: search is at top, filters below it, SectionList at bottom.
# Wait — the user wants bottom search. So in new version: SectionList first, then search at bottom.
# Given the clean file has search at top, we need to:
# 1. Remove search/filter from before_main (before SectionList? No, in clean file search is BEFORE SectionList)
# Actually in the clean file (before broken edit): AppBar -> Search -> Filters -> SectionList -> closing.
# So to move to bottom: AppBar -> SectionList (flex:1) -> Search/Filters
# We can extract: before_search (AppBar), section_list (SectionList), search_filter (search+filters)

# Let's split differently:
# Find AppBar end (before search)
# Find SectionList start and its content
# Actually let's just manually build from the clean file by identifying the three parts.

# Find AppBar line
app_bar_line = '      <AppBar title={t(\'library.title\')}'
app_bar_pos = content.find(app_bar_line)

# Find SectionList opening
section_open_pos = content.find('      <SectionList')
# Find SectionList end (before closing main View)
main_close_pos = content.rfind('    </View>\n  );')

# Extract parts
app_bar_and_before = content[app_bar_pos:section_open_pos]
# The search/filter is between section_open_pos? No, in clean file search is BEFORE SectionList.
# So the order is: AppBar -> Search -> Filters -> SectionList -> Main close
# Given we want: AppBar -> SectionList (flex) -> Search/Filters -> Main close
# We can extract:
# part1 = content[:search_start]  (AppBar + nothing else before search?)
# But AppBar is at very beginning. Let's just split at search_start.

search_start_idx = content.find(search_start_marker)
# Extract search+filters block
search_end_marker = '        SectionSeparatorComponent=> '
# Actually let's extract from search_start to section_open_pos (since in clean file search is before SectionList)
search_filter_content = content[search_start_idx:section_open_pos]

# Section content (from section_open to before main close)
section_content = content[section_open_pos:main_close_pos]

# Rebuild: AppBar + flex wrapper around SectionList + search at bottom + main close
# But we need to include the closing tags properly.
new_content = content[:search_start_idx] + '      {/* Hymn list takes remaining space above bottom search */}\n      <View style={{ flex: 1 }}>\n' + section_content + '      </View>\n\n      {/* Bottom search + filters */}\n' + search_filter_content + content[main_close_pos:]

with open('library_fixed_final.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Fixed and saved library_fixed_final.tsx, length:', len(new_content))
