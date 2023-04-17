---
layout: default
pagination:
  data: collections.post
  size: 20
  alias: posts
permalink: "/category/{{ category | slugify }}/index.html"
eleventyComputed:
  title: "Category: {{ category }}"
---

<header>
  <h2>Category: {{ category }}</h2>
</header>

<p>All posts for a single category, in reverse chronological order.</p>

{% for post in posts reversed %}
  <div>
    <a href="{{post.url}}">{{ post.data.title }}</a>, posted {{ post.date | niceDate }}
    {% excerpt post %}
  </div>
{% endfor %}