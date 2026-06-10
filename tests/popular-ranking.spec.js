import { expect, test } from '@playwright/test';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

test('home popular ranking shows the real recommendation count from the API', async ({ page }) => {
  const apiResponse = await page.request.get(`${baseUrl}/api/ranking/posts`);
  expect(apiResponse.ok()).toBeTruthy();

  const { posts } = await apiResponse.json();
  const topPost = posts.find((post) => post.concept_recommends > 0);
  test.skip(!topPost, 'No recommended posts exist in the current database.');

  await page.goto(baseUrl);
  const rankingItem = page.locator('#ranking .ranking-item').filter({ hasText: topPost.title }).first();

  await expect(rankingItem).toBeVisible();
  await expect(rankingItem.locator('.ranking-meta')).toContainText(`👍 ${topPost.concept_recommends}`);
  await expect(rankingItem.locator('.ranking-meta')).not.toContainText(
    `👍 ${(topPost.concept_recommends * 10000).toLocaleString()}`,
  );
});

test('posts with zero recommendations are not marked popular', async ({ page }) => {
  const boardsResponse = await page.request.get(`${baseUrl}/api/boards`);
  expect(boardsResponse.ok()).toBeTruthy();

  const boards = await boardsResponse.json();
  const zeroRecommendationPosts = [];

  for (const board of boards) {
    const postsResponse = await page.request.get(`${baseUrl}/api/boards/${board.id}/posts?page=1`);
    expect(postsResponse.ok()).toBeTruthy();

    const { posts } = await postsResponse.json();
    zeroRecommendationPosts.push(...posts.filter((post) => post.concept_recommends === 0));
  }

  test.skip(zeroRecommendationPosts.length === 0, 'No zero-recommendation posts exist in the current database.');

  for (const post of zeroRecommendationPosts) {
    expect(post.popular, `post ${post.id} (${post.title}) should not be popular`).toBe(false);
  }
});

test('popular ranking sorts recommendation ties by newest post', async ({ page }) => {
  const rankingResponse = await page.request.get(`${baseUrl}/api/ranking/posts`);
  expect(rankingResponse.ok()).toBeTruthy();
  const rankingData = await rankingResponse.json();

  const boardsResponse = await page.request.get(`${baseUrl}/api/boards`);
  expect(boardsResponse.ok()).toBeTruthy();
  const boards = await boardsResponse.json();

  const allPosts = [];
  for (const board of boards) {
    const postsResponse = await page.request.get(`${baseUrl}/api/boards/${board.id}/posts?page=1`);
    expect(postsResponse.ok()).toBeTruthy();
    const { posts } = await postsResponse.json();
    allPosts.push(...posts);
  }

  const expectedIds = allPosts
    .filter((post) => post.concept_recommends > 0)
    .sort((a, b) => (
      b.concept_recommends - a.concept_recommends
      || b.id - a.id
    ))
    .slice(0, 10)
    .map((post) => post.id);

  test.skip(expectedIds.length === 0, 'No recommended posts exist in the current database.');
  expect(rankingData.posts.map((post) => post.id)).toEqual(expectedIds);
});
