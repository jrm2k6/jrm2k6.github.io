#!/usr/bin/env ruby
# Fetches tags for every repo in _data/release_repos.yml and writes
# _data/releases.json (newest first) for the /releases/ page.
#
# Tags have no date of their own, so each tag costs one extra commit lookup.
# Entries already in releases.json are reused by sha, so only new tags hit
# the API after the first run. GITHUB_TOKEN must be able to read every repo
# in the list, including private ones.
#
#   GITHUB_TOKEN=$(gh auth token) ruby scripts/fetch_releases.rb

require "json"
require "net/http"
require "uri"
require "yaml"

ROOT = File.expand_path("..", __dir__)
REPOS_FILE = File.join(ROOT, "_data", "release_repos.yml")
OUT_FILE = File.join(ROOT, "_data", "releases.json")

def get(path)
  uri = URI("https://api.github.com#{path}")
  req = Net::HTTP::Get.new(uri)
  req["Accept"] = "application/vnd.github+json"
  req["User-Agent"] = "releases-page-fetcher"
  req["Authorization"] = "Bearer #{ENV["GITHUB_TOKEN"]}" if ENV["GITHUB_TOKEN"]
  res = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(req) }
  abort "GET #{path} failed: #{res.code} #{res.body[0, 200]}" unless res.is_a?(Net::HTTPSuccess)
  [JSON.parse(res.body), res["link"]]
end

def all_tags(repo)
  tags = []
  page = 1
  loop do
    batch, link = get("/repos/#{repo}/tags?per_page=100&page=#{page}")
    tags.concat(batch)
    break unless link&.include?('rel="next"')
    page += 1
  end
  tags
end

repos = YAML.load_file(REPOS_FILE)
previous = File.exist?(OUT_FILE) ? JSON.parse(File.read(OUT_FILE)) : []
cache = previous.to_h { |r| ["#{r["repo"]}@#{r["sha"]}", r] }

releases = repos.flat_map do |entry|
  repo = entry.fetch("repo")
  name = entry["name"] || repo.split("/").last
  info, = get("/repos/#{repo}")
  url_for = ->(tag) { info["private"] ? nil : "https://github.com/#{repo}/releases/tag/#{URI.encode_www_form_component(tag)}" }
  all_tags(repo).map do |tag|
    sha = tag.dig("commit", "sha")
    cached = cache["#{name}@#{sha}"]
    if cached
      cached.merge("repo" => name, "tag" => tag["name"], "source" => repo, "url" => url_for.(tag["name"]))
    else
      commit, = get("/repos/#{repo}/commits/#{sha}")
      {
        "repo" => name,
        "source" => repo,
        "tag" => tag["name"],
        "sha" => sha,
        "date" => commit.dig("commit", "committer", "date"),
        "message" => commit.dig("commit", "message").to_s.lines.first.to_s.strip,
        "url" => url_for.(tag["name"])
      }
    end
  end
end

releases.sort_by! { |r| [r["date"], r["tag"]] }.reverse!
File.write(OUT_FILE, JSON.pretty_generate(releases) + "\n")
puts "Wrote #{releases.size} tags to #{OUT_FILE.delete_prefix(ROOT + "/")}"
