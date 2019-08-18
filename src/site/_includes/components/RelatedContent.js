/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const {html} = require('common-tags');
const {findBySlug} = require('../../_filters/find-by-slug');
const {postToPathMap} = require('../../_utils/post-to-path-map');
const PathCard = require('../components/PathCard');
const PostCard = require('../components/PostCard');

/* eslint-disable require-jsdoc, max-len */

function recommendPaths(paths, recommendations = []) {
  paths.forEach((path) => {
    recommendations.push({type: 'path', data: path});
  });
  return recommendations;
}

function recommendTopics(topics, slug, recommendations = []) {
  function addToRecommendations(items) {
    items.forEach((item) => {
      recommendations.push({type: 'topic', data: item});
    });
    return;
  }

  topics.forEach((topic) => {
    const max = 2;
    const idx = topic.pathItems.indexOf(slug);
    const isFirst = idx === 0;
    const isLast = idx === topic.pathItems.length - 1;

    const filteredItems = [].concat(topic.pathItems);
    filteredItems.splice(idx, 1);

    if (!filteredItems.length) {
      return;
    }

    // If there are only 1-2 items left in the topic, return all.
    if (filteredItems.length <= max) {
      addToRecommendations(filteredItems);
      return;
    }

    // If there are multiple items left in the topic...
    // If the item was first in the topic, return the next two.
    if (isFirst) {
      addToRecommendations(filteredItems.splice(0, max));
      return;
    }
    // If the item was last in the topic, return the previous two.
    if (isLast) {
      addToRecommendations(filteredItems.splice(-max, max));
      return;
    }
    // If the item was in the middle of the topic, return the prev and next.
    // note: filteredItems has already been spliced so idx == the next item.
    addToRecommendations(filteredItems.splice(idx - 1, max));
  });

  return recommendations;
}

function renderRecommendations(recommendations) {
  return recommendations.map((recommendation) => {
    if (recommendation.type === 'path') {
      return renderPathCard(recommendation.data);
    } else if (recommendation.type === 'topic') {
      return renderPostCard(recommendation.data);
    }
  });
}

function renderPathCard(path) {
  return html`${PathCard(path)}`;
}

function renderPostCard(slug) {
  const post = findBySlug(slug);
  return html`${PostCard({post, showInfo: true})}`;
}

/**
 * Find related items for a post.
 * This should return PathCards first, if the post is part of a path.
 * Followed by the PostCards for previous and next items, if the post is part of
 * a topic.
 *
 * TODO:
 * If the post is only in the blog (not part of a path or topics), this should
 * return other posts with similar tags. Because we don't have a powerful tag
 * search engine we'll leave this as a TODO for now. In the future we might
 * use something like Algolia to do a combination NLP + tag search.
 * https://www.algolia.com/doc/guides/managing-results/refine-results/filtering/how-to/filter-by-tags/?language=javascript
 * @param {string} slug A post slug.
 * @return {string}
 */
module.exports = (slug) => {
  const result = postToPathMap[slug];
  if (!result) {
    // bail because this is a blog post
    return;
  }
  const {paths, topics} = result;
  const recommendedPaths = recommendPaths(paths);
  const recommendedTopics = recommendTopics(topics, slug);
  let output = [...recommendedPaths, ...recommendedTopics];
  // Cap the number of recommendations at 3.
  output = output.splice(0, 3);

  return html`
    <section class="w-grid">
      <div class="w-grid__columns w-grid__columns--gapless w-grid__columns--three">
        <h3 id="related-content" class="w-learn-heading">
          Related content
          <a class="w-headline-link" href="#related-content" aria-hidden="true">#</a>
        </h3>
      </div>
      <div class="w-grid__columns w-grid__columns--gapless w-grid__columns--three" role="list">
        ${renderRecommendations(output)}
      </div>
    </section>
  `;
};